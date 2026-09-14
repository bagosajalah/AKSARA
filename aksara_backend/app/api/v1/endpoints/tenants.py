from uuid import UUID
from typing import List, Optional
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.knowledge import KnowledgeBase
from app.models.chatbot import ChatSession
from fastapi import Query

from app.api.deps import get_db, get_current_user, require_superadmin
from app.core.security import get_password_hash
from app.models.tenant import Tenant
from app.models.user import User
from app.models.audit import AuditLog
from app.utils.crypto import encrypt_api_key, decrypt_api_key, mask_api_key
from app.schemas.tenant import (
    TenantCreate,
    TenantUpdate,
    TenantStatusUpdate,
    TenantResponse,
    TenantWebsiteCreate,
    TenantWebsiteResponse,
    CheckKodeDinasResponse,
    TenantWebsiteUpdate,
    WidgetConfigResponse,
    WidgetConfigUpdate
)
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/check-kode", response_model=CheckKodeDinasResponse)
async def check_kode_dinas(
    kode: str = Query(..., min_length=2),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Tenant).where(func.lower(Tenant.kode_dinas) == func.lower(kode.strip())))
    existing = result.scalars().first()
    return {"kode_dinas": kode, "exists": existing is not None}

@router.get("/", response_model=List[TenantResponse])
async def list_tenants(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        query = select(Tenant).options(
            selectinload(Tenant.websites),
            selectinload(Tenant.users)
        )

        if current_user.role != "super_admin" and current_user.tenant_id:
            query = query.where(Tenant.id == current_user.tenant_id)
        
        if search:
            query = query.where(
                (Tenant.nama_dinas.ilike(f"%{search}%")) | 
                (Tenant.kode_dinas.ilike(f"%{search}%"))
            )
        if status_filter:
            query = query.where(Tenant.status == status_filter)

        query = query.offset(skip).limit(limit).order_by(Tenant.created_at.desc())
        result = await db.execute(query)
        tenants = result.scalars().all()

        for tenant in tenants:
            doc_count = await db.execute(
                select(func.count()).select_from(KnowledgeBase).where(KnowledgeBase.tenant_id == tenant.id)
            )
            tenant.total_dokumen = doc_count.scalar() or 0
            
            chat_count = await db.execute(
                select(func.count()).select_from(ChatSession).where(ChatSession.tenant_id == tenant.id)
            )
            tenant.sesi_chat = chat_count.scalar() or 0

            admin_user = next((u for u in tenant.users if u.role == "admin_dinas"), None)
            if admin_user:
                tenant.nama_admin = admin_user.nama_lengkap
            else:
                tenant.nama_admin = None

        logger.info(f"Berhasil mengambil {len(tenants)} tenant")
        return tenants
    except Exception as e:
        logger.error(f"ERROR di list_tenants: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=TenantResponse, status_code=201)
async def create_tenant(
    tenant_in: TenantCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    check_res = await db.execute(select(Tenant).where(Tenant.kode_dinas == tenant_in.kode_dinas.strip().lower()))
    if check_res.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Kode dinas '{tenant_in.kode_dinas}' sudah terdaftar dalam sistem."
        )

    new_tenant = Tenant(
        nama_dinas=tenant_in.nama_dinas,
        kode_dinas=tenant_in.kode_dinas.strip().lower(),
        logo_url=tenant_in.logo_url,
        deskripsi=tenant_in.deskripsi,
        status=tenant_in.status or "aktif",
        storage_limit_mb=tenant_in.storage_limit_mb or 1024.0
    )
    db.add(new_tenant)
    await db.flush()

    admin_user = None
    if tenant_in.email_admin and tenant_in.password_admin:
        admin_user = User(
            tenant_id=new_tenant.id,
            email=tenant_in.email_admin,
            nama_lengkap=tenant_in.nama_admin or f"Admin {new_tenant.nama_dinas}",
            hashed_password=get_password_hash(tenant_in.password_admin),
            role="admin_dinas",
            is_active=True
        )
        db.add(admin_user)

    audit = AuditLog(
        tenant_id=new_tenant.id,
        user_id=current_user.id,
        aksi="CREATE_TENANT",
        detail=f"Membuka tenant baru: {new_tenant.nama_dinas} ({new_tenant.kode_dinas})"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(new_tenant)

    result = await db.execute(
        select(Tenant).options(
            selectinload(Tenant.websites),
            selectinload(Tenant.users)
        ).where(Tenant.id == new_tenant.id)
    )
    tenant_with_admin = result.scalars().first()

    if admin_user:
        tenant_with_admin.nama_admin = admin_user.nama_lengkap

    return tenant_with_admin

@router.get("/{tenant_id}", response_model=TenantResponse)
async def get_tenant_detail(
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "super_admin" and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Akses ke data Dinas ini dilarang.")

    result = await db.execute(
        select(Tenant).options(
            selectinload(Tenant.websites),
            selectinload(Tenant.users)
        ).where(Tenant.id == tenant_id)
    )
    tenant = result.scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Dinas/Tenant tidak ditemukan")

    admin_user = next((u for u in tenant.users if u.role == "admin_dinas"), None)
    if admin_user:
        tenant.nama_admin = admin_user.nama_lengkap
    else:
        tenant.nama_admin = None

    return tenant

@router.put("/{tenant_id}", response_model=TenantResponse)
async def update_tenant(
    tenant_id: UUID,
    tenant_in: TenantUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    result = await db.execute(
        select(Tenant).options(
            selectinload(Tenant.websites),
            selectinload(Tenant.users)
        ).where(Tenant.id == tenant_id)
    )
    tenant = result.scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant tidak ditemukan")

    if tenant_in.kode_dinas and tenant_in.kode_dinas != tenant.kode_dinas:
        check = await db.execute(select(Tenant).where(Tenant.kode_dinas == tenant_in.kode_dinas.strip().lower(), Tenant.id != tenant_id))
        if check.scalars().first():
            raise HTTPException(status_code=400, detail=f"Kode dinas '{tenant_in.kode_dinas}' sudah dipakai.")
        tenant.kode_dinas = tenant_in.kode_dinas.strip().lower()

    if tenant_in.nama_dinas:
        tenant.nama_dinas = tenant_in.nama_dinas
    if tenant_in.logo_url is not None:
        tenant.logo_url = tenant_in.logo_url
    if tenant_in.deskripsi is not None:
        tenant.deskripsi = tenant_in.deskripsi
    if tenant_in.status:
        tenant.status = tenant_in.status
    if tenant_in.storage_limit_mb is not None:
        tenant.storage_limit_mb = tenant_in.storage_limit_mb

    if tenant_in.nama_admin is not None:
        admin_result = await db.execute(
            select(User).where(
                User.tenant_id == tenant_id,
                User.role == "admin_dinas"
            )
        )
        admin_user = admin_result.scalars().first()
        if admin_user:
            admin_user.nama_lengkap = tenant_in.nama_admin
            db.add(admin_user)

    audit = AuditLog(
        tenant_id=tenant.id,
        user_id=current_user.id,
        aksi="UPDATE_TENANT",
        detail=f"Update info Dinas {tenant.nama_dinas}"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(tenant)

    result = await db.execute(
        select(Tenant).options(
            selectinload(Tenant.websites),
            selectinload(Tenant.users)
        ).where(Tenant.id == tenant_id)
    )
    tenant = result.scalars().first()

    admin_user = next((u for u in tenant.users if u.role == "admin_dinas"), None)
    if admin_user:
        tenant.nama_admin = admin_user.nama_lengkap

    return tenant

@router.patch("/{tenant_id}/status", response_model=TenantResponse)
async def update_tenant_status(
    tenant_id: UUID,
    status_in: TenantStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    result = await db.execute(
        select(Tenant).options(
            selectinload(Tenant.websites),
            selectinload(Tenant.users)
        ).where(Tenant.id == tenant_id)
    )
    tenant = result.scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant tidak ditemukan")

    tenant.status = status_in.status

    audit = AuditLog(
        tenant_id=tenant.id,
        user_id=current_user.id,
        aksi="UBAH_STATUS_TENANT",
        detail=f"Status Dinas {tenant.nama_dinas} diubah menjadi {status_in.status}"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(tenant)

    result = await db.execute(
        select(Tenant).options(
            selectinload(Tenant.websites),
            selectinload(Tenant.users)
        ).where(Tenant.id == tenant_id)
    )
    tenant = result.scalars().first()

    admin_user = next((u for u in tenant.users if u.role == "admin_dinas"), None)
    if admin_user:
        tenant.nama_admin = admin_user.nama_lengkap

    return tenant

# ==================== WEBSITE ENDPOINTS ====================

@router.post("/{tenant_id}/websites", response_model=TenantWebsiteResponse, status_code=201)
async def add_tenant_website(
    tenant_id: UUID,
    site_in: TenantWebsiteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "super_admin" and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Akses ditolak")

    from app.models.tenant import TenantWebsite
    website = TenantWebsite(
        tenant_id=tenant_id,
        nama_website=site_in.nama_website,
        url=site_in.url,
        status_sync=site_in.status_sync or "synced"
    )
    db.add(website)
    await db.commit()
    await db.refresh(website)
    return website

@router.put("/{tenant_id}/websites/{website_id}", response_model=TenantWebsiteResponse)
async def update_tenant_website(
    tenant_id: UUID,
    website_id: UUID,
    site_in: TenantWebsiteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    from app.models.tenant import TenantWebsite

    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant tidak ditemukan")

    website_result = await db.execute(
        select(TenantWebsite).where(
            TenantWebsite.id == website_id,
            TenantWebsite.tenant_id == tenant_id
        )
    )
    website = website_result.scalars().first()
    if not website:
        raise HTTPException(status_code=404, detail="Website tidak ditemukan")

    if site_in.nama_website is not None:
        website.nama_website = site_in.nama_website
    if site_in.url is not None:
        existing = await db.execute(
            select(TenantWebsite).where(
                TenantWebsite.url == site_in.url,
                TenantWebsite.id != website_id
            )
        )
        if existing.scalars().first():
            raise HTTPException(status_code=400, detail="URL sudah digunakan oleh website lain")
        website.url = site_in.url
    if site_in.status_sync is not None:
        website.status_sync = site_in.status_sync

    audit = AuditLog(
        tenant_id=tenant_id,
        user_id=current_user.id,
        aksi="UPDATE_WEBSITE",
        detail=f"Memperbarui website {website.nama_website}"
    )
    db.add(audit)

    await db.commit()
    await db.refresh(website)
    return website

@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalars().first()
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant tidak ditemukan")

    audit = AuditLog(
        tenant_id=tenant.id,
        user_id=current_user.id,
        aksi="DELETE_TENANT",
        detail=f"Menghapus tenant {tenant.nama_dinas}"
    )
    db.add(audit)

    await db.delete(tenant)
    await db.commit()
    
@router.delete("/{tenant_id}/websites/{website_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant_website(
    tenant_id: UUID,
    website_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_superadmin)
):
    from app.models.tenant import TenantWebsite

    website_result = await db.execute(
        select(TenantWebsite).where(
            TenantWebsite.id == website_id,
            TenantWebsite.tenant_id == tenant_id
        )
    )
    website = website_result.scalars().first()
    if not website:
        raise HTTPException(status_code=404, detail="Website tidak ditemukan")

    await db.delete(website)
    await db.commit()

    return None

# ==================== WIDGET CONFIG ENDPOINTS ====================

@router.get("/{tenant_id}/widget-config", response_model=WidgetConfigResponse)
async def get_widget_config(
    tenant_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant tidak ditemukan")

    domains = [d.strip() for d in (tenant.whitelist_domains or "").split(",") if d.strip()]
    
    api_key_plain = None
    if tenant.api_key_encrypted:
        try:
            api_key_plain = decrypt_api_key(tenant.api_key_encrypted)
        except Exception as e:
            logger.warning(f"Gagal dekripsi API Key: {e}")

    # ✅ NO HARCODE! Ambil dari database atau settings
    return {
        "tenant_id": tenant.id,
        "tenant_kode": tenant.kode_dinas,
        "tenant_nama": tenant.nama_dinas,
        "widget_key": tenant.widget_key or f"aksara-{tenant.kode_dinas}-livekey",
        "whitelist_domains": domains if domains else [f"{tenant.kode_dinas}.ponorogo.go.id"],
        "primary_color": tenant.primary_color or "#10B981",
        "chatbot_name": tenant.chatbot_name or f"Asisten {tenant.nama_dinas}",
        "chatbot_description": tenant.chatbot_description or "Layanan Informasi Layanan Publik",
        "greeting_message": tenant.greeting_message or f"Halo! Ada yang bisa saya bantu terkait layanan di {tenant.nama_dinas}?",
        "system_prompt": tenant.system_prompt or "",
        # ✅ NO HARCODE! Gunakan settings sebagai fallback terakhir
        "llm_provider": tenant.llm_provider or settings.DEFAULT_LLM_PROVIDER or "",
        "llm_model": tenant.llm_model or settings.DEFAULT_LLM_MODEL or "",
        "api_key_masked": mask_api_key(api_key_plain) if api_key_plain else None
    }


@router.put("/{tenant_id}/widget-config", response_model=WidgetConfigResponse)
async def update_widget_config(
    tenant_id: UUID,
    config_in: WidgetConfigUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant tidak ditemukan")

    # Update fields
    if config_in.widget_key is not None:
        tenant.widget_key = config_in.widget_key
    if config_in.whitelist_domains is not None:
        tenant.whitelist_domains = ",".join(config_in.whitelist_domains)
    if config_in.primary_color is not None:
        tenant.primary_color = config_in.primary_color
    if config_in.chatbot_name is not None:
        tenant.chatbot_name = config_in.chatbot_name
    if config_in.chatbot_description is not None:
        tenant.chatbot_description = config_in.chatbot_description
    if config_in.greeting_message is not None:
        tenant.greeting_message = config_in.greeting_message
    if config_in.system_prompt is not None:
        tenant.system_prompt = config_in.system_prompt
    if config_in.llm_provider is not None:
        tenant.llm_provider = config_in.llm_provider
    if config_in.llm_model is not None:
        tenant.llm_model = config_in.llm_model
    
    # ===== 🔐 ENKRIPSI API KEY =====
    if config_in.api_key is not None:
        if config_in.api_key.strip():
            tenant.api_key_encrypted = encrypt_api_key(config_in.api_key)
        else:
            tenant.api_key_encrypted = None
    if config_in.api_key_provider is not None:
        tenant.api_key_provider = config_in.api_key_provider

    await db.commit()
    await db.refresh(tenant)

    api_key_plain = None
    if tenant.api_key_encrypted:
        try:
            api_key_plain = decrypt_api_key(tenant.api_key_encrypted)
        except Exception as e:
            logger.warning(f"Gagal dekripsi API Key: {e}")

    domains = [d.strip() for d in (tenant.whitelist_domains or "").split(",") if d.strip()]

    # ✅ NO HARCODE! Gunakan settings sebagai fallback terakhir
    return {
        "tenant_id": tenant.id,
        "tenant_kode": tenant.kode_dinas,
        "tenant_nama": tenant.nama_dinas,
        "widget_key": tenant.widget_key or f"aksara-{tenant.kode_dinas}-livekey",
        "whitelist_domains": domains,
        "primary_color": tenant.primary_color or "#10B981",
        "chatbot_name": tenant.chatbot_name or f"Asisten {tenant.nama_dinas}",
        "chatbot_description": tenant.chatbot_description or "Layanan Informasi",
        "greeting_message": tenant.greeting_message or "Halo! Ada yang bisa saya bantu?",
        "system_prompt": tenant.system_prompt or "",
        # ✅ NO HARCODE! Gunakan settings sebagai fallback terakhir
        "llm_provider": tenant.llm_provider or settings.DEFAULT_LLM_PROVIDER or "",
        "llm_model": tenant.llm_model or settings.DEFAULT_LLM_MODEL or "",
        "api_key_masked": mask_api_key(api_key_plain) if api_key_plain else None
    }