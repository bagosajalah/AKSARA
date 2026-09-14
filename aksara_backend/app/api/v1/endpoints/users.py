from uuid import UUID
from typing import List, Optional
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload
from app.models.tenant import Tenant

from app.api.deps import get_db, get_current_user, require_superadmin
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.user import UserResponse, UserUpdate, UserCreate, PasswordChange, Token

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def list_users(
    tenant_id: Optional[UUID] = None,
    skip: int = Query(0, ge=0, description="Jumlah data yang dilewati"),
    limit: int = Query(50, ge=1, le=200, description="Jumlah data per halaman"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        query = select(User).options(
            selectinload(User.tenant),
            selectinload(User.roles)
        )

        if current_user.role != "super_admin":
            query = query.where(User.tenant_id == current_user.tenant_id)
        elif tenant_id is not None:
            query = query.where(User.tenant_id == tenant_id)

        query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
        result = await db.execute(query)
        users = result.scalars().all()

        for user in users:
            if user.tenant:
                user.tenant_name = user.tenant.nama_dinas
            else:
                user.tenant_name = None

        logger.info(f"Berhasil mengambil {len(users)} user")
        return users
        
    except Exception as e:
        logger.error(f"ERROR di list_users: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_detail(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(User)
        .options(selectinload(User.tenant), selectinload(User.roles))
        .where(User.id == user_id)
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    if current_user.role != "super_admin" and current_user.tenant_id != user.tenant_id:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(User)
        .options(selectinload(User.tenant), selectinload(User.roles))
        .where(User.id == user_id)
    )
    target_user = result.scalars().first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan")
    
    if current_user.role != "super_admin" and current_user.id != target_user.id:
        raise HTTPException(status_code=403, detail="Anda tidak memiliki izin.")

    if user_in.nama_lengkap is not None:
        target_user.nama_lengkap = user_in.nama_lengkap
    if user_in.email is not None and user_in.email != target_user.email:
        check = await db.execute(select(User).where(User.email == user_in.email))
        if check.scalars().first():
            raise HTTPException(status_code=400, detail="Email sudah digunakan.")
        target_user.email = user_in.email
    if user_in.role is not None and current_user.role == "super_admin":
        target_user.role = user_in.role
    if user_in.is_active is not None and current_user.role == "super_admin":
        target_user.is_active = user_in.is_active
    
    if user_in.tenant_id is not None and current_user.role == "super_admin":
        target_user.tenant_id = user_in.tenant_id
    
    if user_in.nip is not None:
        target_user.nip = user_in.nip

    audit = AuditLog(
        tenant_id=target_user.tenant_id,
        user_id=current_user.id,
        aksi="UPDATE_USER",
        detail=f"Memperbarui data pengguna {target_user.email}"
    )
    db.add(audit)
    await db.commit()
    await db.refresh(target_user)

    if target_user.tenant:
        target_user.tenant_name = target_user.tenant.nama_dinas

    return target_user

@router.patch("/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: UUID,
    is_active: bool,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    result = await db.execute(
        select(User)
        .options(selectinload(User.tenant), selectinload(User.roles))
        .where(User.id == user_id)
    )
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    user.is_active = is_active
    
    audit = AuditLog(
        tenant_id=user.tenant_id,
        user_id=current_user.id,
        aksi="UPDATE_USER_STATUS",
        detail=f"Status user {user.email} diubah menjadi {'Aktif' if is_active else 'Nonaktif'}"
    )
    db.add(audit)
    await db.commit()
    await db.refresh(user)
    return user

@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    result = await db.execute(
        select(User)
        .options(selectinload(User.tenant), selectinload(User.roles))
        .where(User.id == user_id)
    )
    target_user = result.scalars().first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    await db.delete(target_user)
    
    audit = AuditLog(
        tenant_id=target_user.tenant_id,
        user_id=current_user.id,
        aksi="DELETE_USER",
        detail=f"Menghapus pengguna {target_user.email}"
    )
    db.add(audit)
    await db.commit()
    return None