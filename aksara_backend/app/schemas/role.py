from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any

# ===== PERMISSIONS SCHEMAS =====
class TenantPermissions(BaseModel):
    lihatDaftar: bool = False
    tambahTenant: bool = False
    hapusTenant: bool = False
    killSwitch: bool = False

class AIPermissions(BaseModel):
    lihatKonfigurasi: bool = False
    editKonfigurasi: bool = False
    pantauHealth: bool = False

class AuditPermissions(BaseModel):
    lihatDaftar: bool = False
    unduhDokumen: bool = False
    hapusLog: bool = False

class Permissions(BaseModel):
    tenant: TenantPermissions = TenantPermissions()
    ai: AIPermissions = AIPermissions()
    audit: AuditPermissions = AuditPermissions()

# ===== ROLE SCHEMAS =====
class RoleBase(BaseModel):
    name: str
    permissions: Optional[Permissions] = None

class RoleCreate(RoleBase):
    pass

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    permissions: Optional[Permissions] = None

class RoleResponse(RoleBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ===== USER ROLE ASSIGNMENT =====
class UserRoleAssign(BaseModel):
    role_ids: list[UUID]