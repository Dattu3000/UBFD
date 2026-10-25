import uuid
from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.core.database import get_db, set_tenant_rls_context
from app.core.security import decode_access_token
from app.models.tenant import Tenant
from app.schemas.auth_schema import UserContext

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False
)

# Demo Tenant UUID for development & initial seeding
DEMO_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
DEMO_TENANT_SLUG = "apex-holdings-group"
DEMO_TENANT_NAME = "Apex Holdings Group India"


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> UserContext:
    """
    Validates JWT bearer token and resolves the tenant context.
    If no token is supplied and DEMO_MODE is enabled, seamlessly defaults
    to the primary demo tenant for frictionless previewing.
    """
    if token:
        try:
            payload = decode_access_token(token)
            user_id: str = payload.get("sub", "demo-user")
            tenant_id_str: str = payload.get("tenant_id")
            role: str = payload.get("role", "ADMIN")
            if tenant_id_str is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload: missing tenant_id",
                )
            tenant_id = uuid.UUID(tenant_id_str)
        except (JWTError, ValueError):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    else:
        if settings.DEMO_MODE:
            user_id = "rajesh-promoter"
            tenant_id = DEMO_TENANT_ID
            role = "PROMOTER"
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token required",
                headers={"WWW-Authenticate": "Bearer"},
            )

    # Set PostgreSQL session-level RLS context
    await set_tenant_rls_context(db, tenant_id)

    # Verify tenant exists or ensure demo tenant is present
    result = await db.scalar(select(Tenant).where(Tenant.id == tenant_id))
    if not result:
        # Auto-create demo tenant if running in demo mode
        if tenant_id == DEMO_TENANT_ID:
            new_tenant = Tenant(
                id=DEMO_TENANT_ID,
                name=DEMO_TENANT_NAME,
                slug=DEMO_TENANT_SLUG,
            )
            db.add(new_tenant)
            await db.commit()
            tenant_name = DEMO_TENANT_NAME
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Assigned tenant does not exist",
            )
    else:
        tenant_name = result.name

    return UserContext(
        user_id=user_id,
        username=user_id,
        tenant_id=tenant_id,
        tenant_name=tenant_name,
        role=role,
    )
