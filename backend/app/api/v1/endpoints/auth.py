from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.api.dependencies import get_current_user, DEMO_TENANT_ID, DEMO_TENANT_NAME
from app.models.tenant import Tenant
from app.schemas.auth_schema import Token, LoginRequest, UserContext

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=Token)
async def login_for_access_token(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate user and issue a tenant-scoped JWT access token.
    Supports instant login with demo credentials or registered tenants.
    """
    tenant_slug = login_data.tenant_slug or "apex-holdings-group"
    tenant = await db.scalar(select(Tenant).where(Tenant.slug == tenant_slug))

    if not tenant:
        # Create default tenant in demo mode if requested
        if settings.DEMO_MODE:
            tenant = Tenant(
                id=DEMO_TENANT_ID,
                name=DEMO_TENANT_NAME,
                slug="apex-holdings-group",
            )
            db.add(tenant)
            await db.commit()
            await db.refresh(tenant)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username, password, or tenant slug",
            )

    token_payload = {
        "sub": login_data.username,
        "tenant_id": str(tenant.id),
        "role": "PROMOTER" if "promoter" in login_data.username.lower() else "ADMIN",
    }

    access_token = create_access_token(token_payload)

    return Token(
        access_token=access_token,
        token_type="bearer",
        tenant_id=str(tenant.id),
        tenant_name=tenant.name,
    )


@router.get("/me", response_model=UserContext)
async def get_current_user_profile(
    current_user: UserContext = Depends(get_current_user),
):
    """
    Returns authenticated user profile and active tenant organization.
    """
    return current_user
