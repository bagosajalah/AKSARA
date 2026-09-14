import uuid
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

class DataWarga(Base):
    __tablename__ = "data_warga"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    nama_lengkap: Mapped[str] = mapped_column(String(255), nullable=False)
    nik: Mapped[str | None] = mapped_column(String(50), nullable=True)
    alamat: Mapped[str | None] = mapped_column(Text, nullable=True)
    kelurahan: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status_kependudukan: Mapped[str] = mapped_column(String(50), default="aktif", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relasi ke Tenant
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="warga")