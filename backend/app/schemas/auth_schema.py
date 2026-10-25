import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    tenant_id: str
    tenant_name: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = "PROMOTER"


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    tenant_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = "ADMIN"


class LoginRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    password: str
    tenant_slug: Optional[str] = None


class RegisterRequest(BaseModel):
    email: str = Field(..., description="User's personal or corporate email address")
    password: str = Field(..., min_length=6, description="Secure password")
    full_name: str = Field(..., description="Full legal name of the account holder / promoter")
    organization_name: Optional[str] = Field(None, description="Company or Treasury Group name")
    mobile_number: Optional[str] = Field(None, description="Registered mobile number for bank AA sync")


class UserContext(BaseModel):
    user_id: str
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    tenant_id: uuid.UUID
    tenant_name: str
    role: str

    model_config = ConfigDict(from_attributes=True)

