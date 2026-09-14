from uuid import UUID
from typing import AsyncGenerator

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import decode_token
from app.models.user import User


oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login/form"
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token autentikasi tidak valid atau telah kadaluwarsa",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    print("ISI PAYLOAD =", payload)

    if payload is None:
        raise credentials_exception

    if payload.get("type") != "access":
        raise credentials_exception

    user_id = UUID(payload["sub"])

    result = await db.execute(
        select(User)
        .options(selectinload(User.roles), selectinload(User.tenant))
        .where(User.id == user_id)
    )

    user = result.scalars().first()

    print("USER =", user)

    if user is None:
        raise credentials_exception

    print("USER ID =", user.id)
    print("ACTIVE =", user.is_active)
    print("ROLE =", user.role)

    if not user.is_active:
        raise HTTPException(
            status_code=400,
            detail="Akun pengguna ini tidak aktif"
        )

    return user


async def require_superadmin(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Fitur ini memerlukan hak akses SuperAdmin.",
        )
    return current_user


async def require_admin_dinas(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role not in ["super_admin", "admin_dinas"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akses ditolak. Fitur ini memerlukan hak akses Admin Dinas atau SuperAdmin.",
        )
    return current_user