from uuid import UUID
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.schemas.role import RoleResponse

class UserBase(BaseModel):
    email: EmailStr
    nama_lengkap: str
    role: Optional[str] = "admin_dinas"
    tenant_id: Optional[UUID] = None
    tenant_name: Optional[str] = None
    is_active: Optional[bool] = True
    created_at: Optional[datetime] = None
    nip: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    nama_lengkap: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    tenant_id: Optional[UUID] = None
    nip: Optional[str] = None
class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class UserResponse(UserBase):
    id: UUID
    created_at: datetime
    roles: List[RoleResponse] = []

    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str