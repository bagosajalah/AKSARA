# app/models/tenant.py
import uuid
from typing import Optional, List
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
from sqlalchemy import String, Text, Float, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import Integer 
from app.core.database import Base
from app.models.usage import UsageToken
from app.models.knowledge import KnowledgeBase
from app.models.warga import DataWarga

class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    nama_dinas: Mapped[str] = mapped_column(String(255), nullable=False)
    kode_dinas: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    deskripsi: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="aktif", nullable=False)
    storage_used_mb: Mapped[float] = mapped_column(Float, default=0.0)
    storage_limit_mb: Mapped[float] = mapped_column(Float, default=1024.0)
    total_dokumen: Mapped[int] = mapped_column(Integer, default=0)
    sesi_chat: Mapped[int] = mapped_column(Integer, default=0)
    
    # ========== LLM CONFIG (DIUPDATE) ==========
    llm_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    llm_model: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    api_key_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    api_key_provider: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Widget Configuration
    widget_key: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    whitelist_domains: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    primary_color: Mapped[Optional[str]] = mapped_column(String(20), default="#10B981")
    chatbot_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    chatbot_description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    greeting_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    system_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    websites: Mapped[list["TenantWebsite"]] = relationship("TenantWebsite", back_populates="tenant", cascade="all, delete-orphan")
    users: Mapped[list["User"]] = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    warga: Mapped[list["DataWarga"]] = relationship("DataWarga", back_populates="tenant", cascade="all, delete-orphan")
    knowledge_base: Mapped[list["KnowledgeBase"]] = relationship("KnowledgeBase", back_populates="tenant", cascade="all, delete-orphan")
    usage_tokens: Mapped[list["UsageToken"]] = relationship("UsageToken", back_populates="tenant", cascade="all, delete-orphan")


class TenantWebsite(Base):
    __tablename__ = "tenant_websites"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, index=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    nama_website: Mapped[str] = mapped_column(String(255), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    status_sync: Mapped[str] = mapped_column(String(50), default="synced")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="websites")