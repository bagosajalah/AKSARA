from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db, get_current_user
from app.models.audit import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogResponse

router = APIRouter()

@router.get("", response_model=List[AuditLogResponse])
@router.get("/", response_model=List[AuditLogResponse])
async def list_audit_logs(
    tenant_id: Optional[UUID] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(AuditLog)

    if current_user.role != "super_admin":
        query = query.where(AuditLog.tenant_id == current_user.tenant_id)
    elif tenant_id is not None:
        query = query.where(AuditLog.tenant_id == tenant_id)

    query = query.order_by(AuditLog.timestamp.desc()).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    response_list = []
    for log in logs:
        actor_name = log.user.nama_lengkap if log.user else "System"
        tenant_name = log.tenant.nama_dinas if log.tenant else "Pusat"
        
        response_list.append(AuditLogResponse(
            id=log.id,
            tenant_id=log.tenant_id,
            user_id=log.user_id,
            aksi=log.aksi,
            detail=log.detail,
            ip_address=log.ip_address,
            timestamp=log.timestamp,
            actor_name=actor_name,
            tenant_name=tenant_name
        ))

    return response_list
