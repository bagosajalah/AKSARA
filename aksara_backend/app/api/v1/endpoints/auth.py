from uuid import UUID
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, get_current_user
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token
)
from app.models.user import User
from app.models.audit import AuditLog
from app.schemas.user import UserCreate, UserResponse, Token, TokenRefreshRequest, LoginRequest

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db)
):
    
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email sudah terdaftar dalam sistem AKSARA."
        )

    user = User(
        email=user_in.email,
        nama_lengkap=user_in.nama_lengkap,
        hashed_password=get_password_hash(user_in.password),
        role=user_in.role or "admin_dinas",
        tenant_id=user_in.tenant_id,
        is_active=True
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    audit = AuditLog(
        tenant_id=user.tenant_id,
        user_id=user.id,
        aksi="REGISTER_USER",
        detail=f"User {user.email} (Role: {user.role}) berhasil terdaftar."
    )
    db.add(audit)
    await db.commit()

    result = await db.execute(
        select(User)
        .options(selectinload(User.roles), selectinload(User.tenant))
        .where(User.id == user.id)
    )
    user = result.scalars().first()
    
    return user

@router.post("/login", response_model=Token)
async def login_json(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles), selectinload(User.tenant))
        .where(User.email == login_data.email)
    )
    user = result.scalars().first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Akun pengguna ini tidak aktif"
        )
    
    # Buat token
    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        tenant_id=user.tenant_id
    )
    refresh_token = create_refresh_token(subject=user.id)
    
    audit = AuditLog(
        tenant_id=user.tenant_id,
        user_id=user.id,
        aksi="LOGIN",
        detail=f"User {user.email} berhasil login."
    )
    db.add(audit)
    await db.commit()
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/login/form", response_model=Token, summary="OAuth2 compatible form login")
async def login_oauth2_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles), selectinload(User.tenant))
        .where(User.email == form_data.username)
    )
    user = result.scalars().first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau password salah",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Akun pengguna ini tidak aktif"
        )

    access_token = create_access_token(
        subject=user.id,
        role=user.role,
        tenant_id=user.tenant_id
    )
    refresh_token = create_refresh_token(subject=user.id)

    # Audit log
    audit = AuditLog(
        tenant_id=user.tenant_id,
        user_id=user.id,
        aksi="LOGIN",
        detail=f"User {user.email} berhasil login via form."
    )
    db.add(audit)
    await db.commit()

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    body: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db)
):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token tidak valid atau kadaluwarsa"
        )

    user_id = UUID(payload.get("sub"))
    
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles), selectinload(User.tenant))
        .where(User.id == user_id)
    )
    user = result.scalars().first()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User tidak ditemukan atau tidak aktif"
        )

    new_access_token = create_access_token(
        subject=user.id,
        role=user.role,
        tenant_id=user.tenant_id
    )
    new_refresh_token = create_refresh_token(subject=user.id)

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):

    return current_user