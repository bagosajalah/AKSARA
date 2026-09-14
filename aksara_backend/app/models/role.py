import uuid
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class Role(Base):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    permissions: Mapped[dict] = mapped_column(JSON, nullable=False, default={
        "tenant": {
            "lihatDaftar": False,
            "tambahTenant": False,
            "hapusTenant": False,
            "killSwitch": False
        },
        "ai": {
            "lihatKonfigurasi": False,
            "editKonfigurasi": False,
            "pantauHealth": False
        },
        "audit": {
            "lihatDaftar": False,
            "unduhDokumen": False,
            "hapusLog": False
        }
    })
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relasi many-to-many ke User
    users: Mapped[list["User"]] = relationship("User", secondary="user_roles", back_populates="roles")