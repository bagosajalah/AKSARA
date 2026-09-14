from uuid import UUID
from typing import List, Optional
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_user, require_superadmin, require_admin_dinas
from app.models.warga import DataWarga
from app.models.tenant import Tenant
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.warga import WargaCreate, WargaUpdate, WargaResponse

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/", response_model=List[WargaResponse])
async def list_warga(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        query = select(DataWarga).options(selectinload(DataWarga.tenant))

        if current_user.role != "super_admin" and current_user.tenant_id:
            query = query.where(DataWarga.tenant_id == current_user.tenant_id)

        if search:
            query = query.where(
                (DataWarga.nama_lengkap.ilike(f"%{search}%")) |
                (DataWarga.nik.ilike(f"%{search}%"))
            )

        query = query.offset(skip).limit(limit).order_by(DataWarga.created_at.desc())
        result = await db.execute(query)
        warga_list = result.scalars().all()

        # Isi tenant_name dari relasi
        for w in warga_list:
            if w.tenant:
                w.tenant_name = w.tenant.nama_dinas
            else:
                w.tenant_name = None

        return warga_list
    except Exception as e:
        logger.error(f"ERROR di list_warga: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=WargaResponse, status_code=201)
async def create_warga(
    warga_in: WargaCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_dinas)
):
    try:
        # Jika user bukan super_admin, gunakan tenant_id dari user
        tenant_id = warga_in.tenant_id
        if current_user.role != "super_admin":
            tenant_id = current_user.tenant_id

        new_warga = DataWarga(
            tenant_id=tenant_id,
            nama_lengkap=warga_in.nama_lengkap,
            nik=warga_in.nik,
            alamat=warga_in.alamat,
            kelurahan=warga_in.kelurahan,
            status_kependudukan=warga_in.status_kependudukan or "aktif"
        )
        db.add(new_warga)

        audit = AuditLog(
            tenant_id=tenant_id,
            user_id=current_user.id,
            aksi="CREATE_WARGA",
            detail=f"Menambah data warga: {warga_in.nama_lengkap}"
        )
        db.add(audit)

        await db.commit()
        await db.refresh(new_warga)

        # Load dengan eager load untuk response
        result = await db.execute(
            select(DataWarga).options(selectinload(DataWarga.tenant)).where(DataWarga.id == new_warga.id)
        )
        warga = result.scalars().first()
        if warga and warga.tenant:
            warga.tenant_name = warga.tenant.nama_dinas

        return warga
    except Exception as e:
        logger.error(f"ERROR di create_warga: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{warga_id}", response_model=WargaResponse)
async def get_warga_detail(
    warga_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        result = await db.execute(
            select(DataWarga).options(selectinload(DataWarga.tenant)).where(DataWarga.id == warga_id)
        )
        warga = result.scalars().first()
        if not warga:
            raise HTTPException(status_code=404, detail="Data warga tidak ditemukan")

        if current_user.role != "super_admin" and current_user.tenant_id != warga.tenant_id:
            raise HTTPException(status_code=403, detail="Akses ditolak")

        if warga.tenant:
            warga.tenant_name = warga.tenant.nama_dinas

        return warga
    except Exception as e:
        logger.error(f"ERROR di get_warga_detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{warga_id}", response_model=WargaResponse)
async def update_warga(
    warga_id: UUID,
    warga_in: WargaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_dinas)
):
    try:
        result = await db.execute(
            select(DataWarga).options(selectinload(DataWarga.tenant)).where(DataWarga.id == warga_id)
        )
        warga = result.scalars().first()
        if not warga:
            raise HTTPException(status_code=404, detail="Data warga tidak ditemukan")

        if current_user.role != "super_admin" and current_user.tenant_id != warga.tenant_id:
            raise HTTPException(status_code=403, detail="Akses ditolak")

        if warga_in.nama_lengkap is not None:
            warga.nama_lengkap = warga_in.nama_lengkap
        if warga_in.nik is not None:
            warga.nik = warga_in.nik
        if warga_in.alamat is not None:
            warga.alamat = warga_in.alamat
        if warga_in.kelurahan is not None:
            warga.kelurahan = warga_in.kelurahan
        if warga_in.status_kependudukan is not None:
            warga.status_kependudukan = warga_in.status_kependudukan

        audit = AuditLog(
            tenant_id=warga.tenant_id,
            user_id=current_user.id,
            aksi="UPDATE_WARGA",
            detail=f"Update data warga: {warga.nama_lengkap}"
        )
        db.add(audit)

        await db.commit()
        await db.refresh(warga)

        if warga.tenant:
            warga.tenant_name = warga.tenant.nama_dinas

        return warga
    except Exception as e:
        logger.error(f"ERROR di update_warga: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{warga_id}", status_code=204)
async def delete_warga(
    warga_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_dinas)
):
    try:
        result = await db.execute(select(DataWarga).where(DataWarga.id == warga_id))
        warga = result.scalars().first()
        if not warga:
            raise HTTPException(status_code=404, detail="Data warga tidak ditemukan")

        if current_user.role != "super_admin" and current_user.tenant_id != warga.tenant_id:
            raise HTTPException(status_code=403, detail="Akses ditolak")

        audit = AuditLog(
            tenant_id=warga.tenant_id,
            user_id=current_user.id,
            aksi="DELETE_WARGA",
            detail=f"Menghapus data warga: {warga.nama_lengkap}"
        )
        db.add(audit)

        await db.delete(warga)
        await db.commit()
        return None
    except Exception as e:
        logger.error(f"ERROR di delete_warga: {e}")
        raise HTTPException(status_code=500, detail=str(e))