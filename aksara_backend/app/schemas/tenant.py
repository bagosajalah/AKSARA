from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, ConfigDict

# ===== WEBSITE SCHEMAS =====
class TenantWebsiteBase(BaseModel):
    nama_website: str
    url: str
    status_sync: Optional[str] = "synced"

class TenantWebsiteCreate(TenantWebsiteBase):
    pass

class TenantWebsiteUpdate(BaseModel):
    nama_website: Optional[str] = None
    url: Optional[str] = None
    status_sync: Optional[str] = None

class TenantWebsiteResponse(TenantWebsiteBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# ===== TENANT SCHEMAS =====
class TenantBase(BaseModel):
    nama_dinas: str
    kode_dinas: str
    logo_url: Optional[str] = None
    deskripsi: Optional[str] = None
    status: Optional[str] = "aktif"
    storage_limit_mb: Optional[float] = 1024.0

class TenantCreate(TenantBase):
    nama_admin: Optional[str] = None
    email_admin: Optional[str] = None
    password_admin: Optional[str] = None

class TenantUpdate(BaseModel):
    nama_dinas: Optional[str] = None
    kode_dinas: Optional[str] = None
    logo_url: Optional[str] = None
    deskripsi: Optional[str] = None
    status: Optional[str] = None
    storage_limit_mb: Optional[float] = None
    nama_admin: Optional[str] = None

class TenantStatusUpdate(BaseModel):
    status: str

class TenantResponse(TenantBase):
    id: UUID
    storage_used_mb: float
    created_at: datetime
    updated_at: datetime
    websites: List[TenantWebsiteResponse] = []
    nama_admin: Optional[str] = None
    sesi_chat: int = 0

    model_config = ConfigDict(from_attributes=True)

class CheckKodeDinasResponse(BaseModel):
    kode_dinas: str
    exists: bool

# ===== WIDGET CONFIG SCHEMAS =====
class WidgetConfigBase(BaseModel):
    widget_key: Optional[str] = None
    whitelist_domains: Optional[List[str]] = []
    primary_color: Optional[str] = "#10B981"
    chatbot_name: Optional[str] = None
    chatbot_description: Optional[str] = None
    greeting_message: Optional[str] = None
    system_prompt: Optional[str] = None

class WidgetConfigUpdate(WidgetConfigBase):
    llm_provider: Optional[str] = None
    llm_model: Optional[str] = None
    api_key: Optional[str] = None
    api_key_provider: Optional[str] = None

class WidgetConfigResponse(WidgetConfigBase):
    tenant_id: UUID
    tenant_kode: str
    tenant_nama: str
    llm_provider: Optional[str] = "google_gemini"
    llm_model: Optional[str] = "gemini-1.5-flash"
    api_key_masked: Optional[str] = None
    api_key_provider: Optional[str] = None