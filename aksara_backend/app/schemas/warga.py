from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

class WargaBase(BaseModel):
    nama_lengkap: str
    nik: Optional[str] = None
    alamat: Optional[str] = None
    kelurahan: Optional[str] = None
    status_kependudukan: Optional[str] = "aktif"

class WargaCreate(WargaBase):
    tenant_id: UUID

class WargaUpdate(BaseModel):
    nama_lengkap: Optional[str] = None
    nik: Optional[str] = None
    alamat: Optional[str] = None
    kelurahan: Optional[str] = None
    status_kependudukan: Optional[str] = None

class WargaResponse(WargaBase):
    id: UUID
    tenant_id: UUID
    tenant_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)