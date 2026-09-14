from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class AuditLogResponse(BaseModel):
    id: UUID
    tenant_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    aksi: str
    detail: Optional[str] = None
    ip_address: Optional[str] = None
    timestamp: datetime
    actor_name: Optional[str] = None
    tenant_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
