from uuid import UUID
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_user, require_superadmin
from app.models.role import Role
from app.models.user import User
from app.models.user_role import user_roles
from app.models.audit import AuditLog
from app.schemas.role import RoleCreate, RoleUpdate, RoleResponse, Permissions

router = APIRouter()

# ========== CRUD ROLE ==========

@router.get("/", response_model=List[RoleResponse])
async def list_roles(
    skip: int = Query(0, ge=0, description="Jumlah data yang dilewati"),
    limit: int = Query(50, ge=1, le=200, description="Jumlah data per halaman"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List semua role dengan pagination"""
    
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
    
    query = select(Role).order_by(Role.created_at.desc())
    query = query.offset(skip).limit(limit)
    
    result = await db.execute(query)
    roles = result.scalars().all()
    
    # Hitung user_count per role
    if roles:
        role_ids = [role.id for role in roles]
        count_result = await db.execute(
            select(user_roles.c.role_id, func.count().label('count'))
            .where(user_roles.c.role_id.in_(role_ids))
            .group_by(user_roles.c.role_id)
        )
        counts = {row.role_id: row.count for row in count_result.all()}
        for role in roles:
            role.user_count = counts.get(role.id, 0)
    
    return roles

@router.post("/", response_model=RoleResponse, status_code=201)
async def create_role(
    role_in: RoleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """Buat role baru"""
    
    check = await db.execute(select(Role).where(Role.name == role_in.name))
    if check.scalars().first():
        raise HTTPException(status_code=400, detail=f"Role '{role_in.name}' sudah ada")

    permissions = role_in.permissions.model_dump() if role_in.permissions else None

    new_role = Role(
        name=role_in.name,
        permissions=permissions or {
            "tenant": {"lihatDaftar": False, "tambahTenant": False, "hapusTenant": False, "killSwitch": False},
            "ai": {"lihatKonfigurasi": False, "editKonfigurasi": False, "pantauHealth": False},
            "audit": {"lihatDaftar": False, "unduhDokumen": False, "hapusLog": False}
        }
    )
    db.add(new_role)

    audit = AuditLog(
        tenant_id=None,
        user_id=current_user.id,
        aksi="CREATE_ROLE",
        detail=f"Membuat role baru: {role_in.name}"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(new_role)
    return new_role

@router.get("/{role_id}", response_model=RoleResponse)
async def get_role_detail(
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    result = await db.execute(
        select(Role)
        .options(selectinload(Role.users))
        .where(Role.id == role_id)
    )
    role = result.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role tidak ditemukan")
    return role

@router.put("/{role_id}", response_model=RoleResponse)
async def update_role(
    role_id: UUID,
    role_in: RoleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    result = await db.execute(
        select(Role)
        .options(selectinload(Role.users))
        .where(Role.id == role_id)
    )
    role = result.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role tidak ditemukan")

    if role_in.name and role_in.name != role.name:
        check = await db.execute(select(Role).where(Role.name == role_in.name))
        if check.scalars().first():
            raise HTTPException(status_code=400, detail=f"Role '{role_in.name}' sudah ada")
        role.name = role_in.name

    if role_in.permissions:
        role.permissions = role_in.permissions.model_dump()

    audit = AuditLog(
        tenant_id=None,
        user_id=current_user.id,
        aksi="UPDATE_ROLE",
        detail=f"Update role: {role.name}"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(role)
    return role

@router.delete("/{role_id}", status_code=204)
async def delete_role(
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """Hapus role (hanya jika tidak digunakan oleh user)"""
    
    result = await db.execute(
        select(Role)
        .options(selectinload(Role.users))
        .where(Role.id == role_id)
    )
    role = result.scalars().first()
    
    if not role:
        raise HTTPException(status_code=404, detail="Role tidak ditemukan")

    if role.users:
        raise HTTPException(
            status_code=400,
            detail=f"Role '{role.name}' masih digunakan oleh {len(role.users)} user. Hapus assign terlebih dahulu."
        )

    audit = AuditLog(
        tenant_id=None,
        user_id=current_user.id,
        aksi="DELETE_ROLE",
        detail=f"Hapus role: {role.name}"
    )
    db.add(audit)

    await db.delete(role)
    await db.commit()
    return None

# ========== ASSIGN ROLE TO USER ==========

@router.post("/users/{user_id}/roles", response_model=List[RoleResponse])
async def assign_roles_to_user(
    user_id: UUID,
    role_ids: List[UUID],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """Assign multiple roles to a user"""
    
    user_result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user_id)
    )
    user = user_result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    for role_id in role_ids:
        role_result = await db.execute(select(Role).where(Role.id == role_id))
        if not role_result.scalars().first():
            raise HTTPException(status_code=404, detail=f"Role dengan ID {role_id} tidak ditemukan")

    role_results = await db.execute(select(Role).where(Role.id.in_(role_ids)))
    new_roles = role_results.scalars().all()
    user.roles = new_roles

    audit = AuditLog(
        tenant_id=user.tenant_id,
        user_id=current_user.id,
        aksi="ASSIGN_ROLES",
        detail=f"Assign roles ke user {user.email}: {[r.name for r in new_roles]}"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(user)
    
    user_result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user_id)
    )
    user = user_result.scalars().first()
    return user.roles

@router.delete("/users/{user_id}/roles/{role_id}", status_code=204)
async def remove_role_from_user(
    user_id: UUID,
    role_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    """Remove a role from a user"""
    
    user_result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user_id)
    )
    user = user_result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    role_result = await db.execute(select(Role).where(Role.id == role_id))
    role = role_result.scalars().first()
    if not role:
        raise HTTPException(status_code=404, detail="Role tidak ditemukan")

    if role not in user.roles:
        raise HTTPException(status_code=400, detail=f"User tidak memiliki role '{role.name}'")

    user.roles.remove(role)

    audit = AuditLog(
        tenant_id=user.tenant_id,
        user_id=current_user.id,
        aksi="REMOVE_ROLE",
        detail=f"Remove role '{role.name}' dari user {user.email}"
    )
    db.add(audit)

    await db.commit()
    return None