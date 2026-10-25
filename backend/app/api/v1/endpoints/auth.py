import re
import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.api.dependencies import get_current_user, DEMO_TENANT_ID, DEMO_TENANT_NAME
from app.models.tenant import Tenant
from app.models.user import User
from app.models.entity import Entity
from app.schemas.auth_schema import Token, LoginRequest, RegisterRequest, UserContext

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register_personal_account(
    reg_data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user account with personal/corporate email ID,
    initialize their dedicated isolated tenant workspace, and create a primary legal entity.
    """
    clean_email = reg_data.email.strip().lower()
    if not clean_email or "@" not in clean_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid personal or corporate email address is required",
        )

    # Check if user already exists
    existing = await db.scalar(select(User).where(func.lower(User.email) == clean_email))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please sign in.",
        )

    # Determine Organization / Workspace Name
    org_name = (reg_data.organization_name or "").strip()
    if not org_name:
        prefix = clean_email.split("@")[0].replace(".", " ").title()
        org_name = f"{prefix} Treasury"

    # Generate unique slug
    raw_slug = re.sub(r"[^a-z0-9]+", "-", org_name.lower()).strip("-")
    tenant_slug = f"{raw_slug[:40]}-{uuid.uuid4().hex[:6]}"

    # Create new Tenant
    new_tenant = Tenant(
        id=uuid.uuid4(),
        name=org_name,
        slug=tenant_slug,
    )
    db.add(new_tenant)
    await db.flush()

    # Create initial primary Legal Entity for linking real bank accounts
    new_entity = Entity(
        id=uuid.uuid4(),
        tenant_id=new_tenant.id,
        name=f"{org_name} Commercial Entity",
        entity_type="PVT_LTD",
        base_currency="INR",
    )
    db.add(new_entity)

    # Create User
    new_user = User(
        id=uuid.uuid4(),
        email=clean_email,
        hashed_password=get_password_hash(reg_data.password),
        full_name=reg_data.full_name.strip(),
        mobile_number=reg_data.mobile_number.strip() if reg_data.mobile_number else None,
        tenant_id=new_tenant.id,
        role="PROMOTER",
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    token_payload = {
        "sub": str(new_user.id),
        "email": new_user.email,
        "tenant_id": str(new_tenant.id),
        "role": new_user.role,
    }
    access_token = create_access_token(token_payload)

    return Token(
        access_token=access_token,
        token_type="bearer",
        tenant_id=str(new_tenant.id),
        tenant_name=new_tenant.name,
        email=new_user.email,
        full_name=new_user.full_name,
        role=new_user.role,
    )


@router.post("/login", response_model=Token)
async def login_for_access_token(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate user via personal email and password, or demo credentials.
    Issues a tenant-scoped JWT access token.
    """
    identifier = (login_data.email or login_data.username or "").strip()
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username is required to sign in",
        )

    # 1. First check if personal user registered in database
    user = await db.scalar(
        select(User).where(func.lower(User.email) == identifier.lower())
    )

    if user:
        if not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password. Please verify credentials.",
            )
        tenant = await db.scalar(select(Tenant).where(Tenant.id == user.tenant_id))
        tenant_name = tenant.name if tenant else "Personal Treasury"

        token_payload = {
            "sub": str(user.id),
            "email": user.email,
            "tenant_id": str(user.tenant_id),
            "role": user.role,
        }
        access_token = create_access_token(token_payload)

        return Token(
            access_token=access_token,
            token_type="bearer",
            tenant_id=str(user.tenant_id),
            tenant_name=tenant_name,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
        )

    # 2. Fallback for demo mode / testing
    tenant_slug = login_data.tenant_slug or "apex-holdings-group"
    tenant = await db.scalar(select(Tenant).where(Tenant.slug == tenant_slug))

    if not tenant:
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
                detail="No account found matching this email. Please register.",
            )

    token_payload = {
        "sub": identifier,
        "email": f"{identifier}@ubfd.io" if "@" not in identifier else identifier,
        "tenant_id": str(tenant.id),
        "role": "PROMOTER" if "promoter" in identifier.lower() else "ADMIN",
    }
    access_token = create_access_token(token_payload)

    return Token(
        access_token=access_token,
        token_type="bearer",
        tenant_id=str(tenant.id),
        tenant_name=tenant.name,
        email=token_payload["email"],
        full_name=identifier.replace("-", " ").title(),
        role=token_payload["role"],
    )


@router.get("/me", response_model=UserContext)
async def get_current_user_profile(
    current_user: UserContext = Depends(get_current_user),
):
    """
    Returns authenticated user profile and active tenant organization.
    """
    return current_user
