import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    tenant_id: str
    tenant_name: str


class TokenPayload(BaseModel):
    sub: Optional[str] = None
    tenant_id: Optional[str] = None
    role: Optional[str] = "ADMIN"


class LoginRequest(BaseModel):
    username: str
    password: str
    tenant_slug: Optional[str] = "default-group"


class UserContext(BaseModel):
    user_id: str
    username: str
    tenant_id: uuid.UUID
    tenant_name: str
    role: str

    model_config = ConfigDict(from_attributes=True)
