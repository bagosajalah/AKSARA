from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
import uuid

from app.api.deps import get_db, get_current_user, require_superadmin
from app.models.tenant import Tenant
from app.models.knowledge import KnowledgeBase
from app.schemas.storage import StorageLimitUpdate, StorageGlobalConfig

router = APIRouter()


@router.get("/tenants/{tenant_id}/storage")
async def get_storage_usage(
    tenant_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if current_user.role != "super_admin":
        if str(current_user.tenant_id) != tenant_id:
            raise HTTPException(403, "Lo cuma boleh liat tenant lo sendiri!")

    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == uuid.UUID(tenant_id))
    )
    tenant = tenant_result.scalars().first()
    
    if not tenant:
        raise HTTPException(404, "Tenant ga ketemu!")

    knowledge_result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.tenant_id == uuid.UUID(tenant_id))
    )
    articles = knowledge_result.scalars().all()
    total_dokumen = len(articles)

    total_bytes = sum(a.file_size or 0 for a in articles)
    used_mb = round(total_bytes / (1024 * 1024), 2) if total_bytes > 0 else 0
    
    max_mb = tenant.storage_limit_mb or 1024.0
    percentage = round((used_mb / max_mb) * 100, 2) if max_mb > 0 else 0
    available_mb = round(max(0, max_mb - used_mb), 2)
    
    return {
        "status": "success",
        "data": {
            "used_mb": used_mb,
            "max_mb": float(max_mb),
            "used_percentage": min(percentage, 100),
            "files_count": total_dokumen,
            "available_mb": available_mb
        }
    }

@router.get("/admin/tenants/storage/limits")
async def get_all_tenant_limits(
    current_user: Dict[str, Any] = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db)
):
    tenant_result = await db.execute(select(Tenant))
    tenants = tenant_result.scalars().all()
    
    result = []
    for t in tenants:
        knowledge_result = await db.execute(
            select(KnowledgeBase).where(KnowledgeBase.tenant_id == t.id)
        )
        articles = knowledge_result.scalars().all()

        total_bytes = sum(a.file_size or 0 for a in articles)
        used_mb = round(total_bytes / (1024 * 1024), 2) if total_bytes > 0 else 0
        
        result.append({
            "tenant_id": str(t.id),
            "tenant_name": t.nama_dinas,
            "storage_limit": int(t.storage_limit_mb or 1024),
            "storage_used": used_mb,
            "files_count": len(articles)
        })
    
    return {"status": "success", "data": result}

@router.put("/admin/tenants/{tenant_id}/storage/limit")
async def update_storage_limit(
    tenant_id: str,
    data: StorageLimitUpdate,
    current_user: Dict[str, Any] = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db)
):
    tenant_result = await db.execute(
        select(Tenant).where(Tenant.id == uuid.UUID(tenant_id))
    )
    tenant = tenant_result.scalars().first()
    
    if not tenant:
        raise HTTPException(404, "Tenant ga ketemu!")
    
    tenant.storage_limit_mb = float(data.max_mb)
    await db.commit()
    await db.refresh(tenant)
    
    return {
        "status": "success",
        "message": f"Storage limit diubah jadi {data.max_mb} MB",
        "data": {
            "tenant_id": tenant_id,
            "max_mb": data.max_mb,
            "updated_by": current_user.email
        }
    }

@router.put("/admin/tenants/storage/global-default")
async def update_global_default(
    config: StorageGlobalConfig,
    current_user: Dict[str, Any] = Depends(require_superadmin),
    db: AsyncSession = Depends(get_db)
):
    await db.execute(
        Tenant.__table__.update()
        .where(Tenant.storage_limit_mb == 0)
        .values(storage_limit_mb=config.default_storage_limit)
    )
    await db.commit()
    
    return {
        "status": "success",
        "message": f"Default storage global diupdate ke {config.default_storage_limit} MB",
        "data": config.dict()
    }