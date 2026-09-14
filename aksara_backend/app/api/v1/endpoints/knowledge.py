from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx
import os
import logging

from app.api.deps import get_db, get_current_user
from app.models.knowledge import KnowledgeBase
from app.models.chatbot import ChatbotInteraction
from app.models.user import User
from app.models.tenant import Tenant
from app.utils.crypto import decrypt_api_key
from app.schemas.knowledge import (
    KnowledgeBaseCreate,
    KnowledgeBaseUpdate,
    KnowledgeBaseResponse,
    ChatbotInteractionCreate,
    ChatbotInteractionResponse
)
from app.services.cache_service import invalidate_cache

logger = logging.getLogger(__name__)
router = APIRouter()

CHROMA_HOST = os.getenv("CHROMA_HOST", "chromadb")
CHROMA_PORT = os.getenv("CHROMA_PORT", "8000")


# ===== HELPER: AMBIL GEMINI API KEY DARI DATABASE TENANT =====
async def _get_tenant_gemini_api_key(tenant_id: str, db: AsyncSession) -> Optional[str]:
    """Ambil & dekripsi API Key Gemini dari database tenant."""
    try:
        result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = result.scalars().first()
        if not tenant:
            logger.error(f"Tenant {tenant_id} tidak ditemukan")
            return None

        if not tenant.api_key_encrypted:
            logger.error(f"Tenant {tenant.kode_dinas} tidak punya API Key")
            return None

        try:
            api_key = decrypt_api_key(tenant.api_key_encrypted)
            if api_key:
                logger.info(f"API Key dari database tenant: {tenant.kode_dinas}")
                return api_key
        except Exception as e:
            logger.warning(f"Gagal dekripsi API Key: {e}")

        # Fallback ke .env
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if api_key:
            logger.info("API Key dari .env (fallback)")
        return api_key
    except Exception as e:
        logger.error(f"Error ambil API Key tenant: {e}")
        return None


# ===== HELPER: GENERATE EMBEDDING VIA GEMINI =====
async def _get_embedding(text: str, tenant_id: str, db: AsyncSession) -> Optional[List[float]]:
    """Generate embedding pakai Gemini text-embedding-004 (API Key dari database tenant)"""
    try:
        from google import genai

        api_key = await _get_tenant_gemini_api_key(str(tenant_id), db)
        if not api_key:
            logger.error("API Key tidak ada (database & .env kosong)")
            return None

        client = genai.Client(api_key=api_key)

        # Truncate biar gak over token limit
        truncated = text[:8000]

        result = client.models.embed_content(
            model="models/gemini-embedding-001",
            contents=truncated
        )

        if result and result.embeddings and len(result.embeddings) > 0:
            embedding = result.embeddings[0].values
            logger.info(f"Generated embedding: {len(embedding)} dimensions")
            return embedding
        return None

    except Exception as e:
        logger.error(f"Failed to generate embedding: {e}")
        return None


# ===== HELPER: CHROMADB OPERATIONS (API v2) =====
async def _get_or_create_collection(tenant_id: str) -> Optional[str]:
    """Dapatkan atau buat collection ChromaDB. Return collection_id."""
    collection_name = f"tenant_{tenant_id}"
    base_url = f"http://{CHROMA_HOST}:{CHROMA_PORT}/api/v2/tenants/default_tenant/databases/default_database/collections"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(base_url)
            if resp.status_code == 200:
                for col in resp.json():
                    if col.get("name") == collection_name:
                        logger.info(f"Collection {collection_name} found: {col.get('id')}")
                        return col.get("id")

            resp = await client.post(
                base_url,
                json={"name": collection_name, "metadata": {"tenant_id": tenant_id, "hnsw:space": "cosine"}}
            )
            if resp.status_code in (200, 201):
                col_id = resp.json().get("id")
                logger.info(f"Collection {collection_name} created: {col_id}")
                return col_id
            else:
                logger.warning(f"Failed create collection: {resp.status_code} {resp.text[:200]}")
                return None
    except Exception as e:
        logger.error(f"Error get/create collection: {e}")
        return None


async def _add_to_chroma(tenant_id: str, kb: KnowledgeBase, db: AsyncSession):
    """Tambah/update dokumen ke ChromaDB dengan EMBEDDING"""
    collection_id = await _get_or_create_collection(str(tenant_id))
    if not collection_id:
        logger.warning(f"Skip embedding: no collection for tenant {tenant_id}")
        return

    embedding = await _get_embedding(kb.konten, str(tenant_id), db)
    if not embedding:
        logger.warning(f"Skip embed KB '{kb.judul}': no embedding generated")
        return

    base_url = f"http://{CHROMA_HOST}:{CHROMA_PORT}/api/v2/tenants/default_tenant/databases/default_database/collections/{collection_id}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            await client.post(
                f"{base_url}/delete",
                json={"ids": [str(kb.id)]}
            )

            resp = await client.post(
                f"{base_url}/add",
                json={
                    "ids": [str(kb.id)],
                    "embeddings": [embedding],
                    "documents": [kb.konten],
                    "metadatas": [{
                        "id": str(kb.id),
                        "judul": kb.judul,
                        "kategori": kb.kategori or "Umum",
                        "tenant_id": str(tenant_id)
                    }]
                }
            )

            if resp.status_code in (200, 201):
                logger.info(f"Embedded KB '{kb.judul}' to ChromaDB ({collection_id})")
            else:
                logger.warning(f"Failed embed: {resp.status_code} {resp.text[:300]}")
    except Exception as e:
        logger.error(f"Error add to chroma: {e}")


async def _delete_from_chroma(tenant_id: str, knowledge_id: str):
    """Hapus dokumen dari ChromaDB"""
    collection_name = f"tenant_{tenant_id}"
    base_url = f"http://{CHROMA_HOST}:{CHROMA_PORT}/api/v2/tenants/default_tenant/databases/default_database/collections"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(base_url)
            if resp.status_code != 200:
                return

            collection_id = None
            for col in resp.json():
                if col.get("name") == collection_name:
                    collection_id = col.get("id")
                    break

            if collection_id:
                await client.post(
                    f"{base_url}/{collection_id}/delete",
                    json={"ids": [knowledge_id]}
                )
                logger.info(f"Deleted {knowledge_id} from ChromaDB")
    except Exception as e:
        logger.error(f"Error delete from chroma: {e}")


# ===== ENDPOINTS =====
@router.get("/", response_model=List[KnowledgeBaseResponse])
async def list_knowledge_base(
    tenant_id: Optional[UUID] = None,
    kategori: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(KnowledgeBase)
    if current_user.role != "super_admin":
        query = query.where(KnowledgeBase.tenant_id == current_user.tenant_id)
    elif tenant_id is not None:
        query = query.where(KnowledgeBase.tenant_id == tenant_id)

    if kategori:
        query = query.where(KnowledgeBase.kategori == kategori)

    result = await db.execute(query.order_by(KnowledgeBase.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=KnowledgeBaseResponse, status_code=201)
async def create_knowledge_base(
    kb_in: KnowledgeBaseCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "super_admin" and current_user.tenant_id != kb_in.tenant_id:
        kb_in.tenant_id = current_user.tenant_id

    kb = KnowledgeBase(
        tenant_id=kb_in.tenant_id,
        judul=kb_in.judul,
        kategori=kb_in.kategori,
        konten=kb_in.konten,
        status=kb_in.status or "published",
        file_size=kb_in.file_size or 0,
        file_type=kb_in.file_type or "TXT"
    )
    db.add(kb)
    await db.commit()
    await db.refresh(kb)

    await _add_to_chroma(str(kb.tenant_id), kb, db)

    try:
        invalidate_cache(str(kb.tenant_id))
    except Exception:
        pass

    return kb


@router.post("/interactions", response_model=ChatbotInteractionResponse, status_code=201)
async def log_chatbot_interaction(
    interaction_in: ChatbotInteractionCreate,
    db: AsyncSession = Depends(get_db)
):
    interaction = ChatbotInteraction(
        tenant_id=interaction_in.tenant_id,
        session_id=interaction_in.session_id,
        user_query=interaction_in.user_query,
        bot_response=interaction_in.bot_response,
        sentiment=interaction_in.sentiment
    )
    db.add(interaction)
    await db.flush()
    return interaction


@router.get("/interactions", response_model=List[ChatbotInteractionResponse])
async def get_chatbot_interactions(
    tenant_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(ChatbotInteraction)
    if current_user.role != "super_admin":
        query = query.where(ChatbotInteraction.tenant_id == current_user.tenant_id)
    elif tenant_id is not None:
        query = query.where(ChatbotInteraction.tenant_id == tenant_id)

    result = await db.execute(query.order_by(ChatbotInteraction.created_at.desc()).limit(100))
    return result.scalars().all()


@router.put("/{knowledge_id}", response_model=KnowledgeBaseResponse)
async def update_knowledge(
    knowledge_id: UUID,
    kb_in: KnowledgeBaseUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.id == knowledge_id)
    )
    kb = result.scalars().first()

    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge Base tidak ditemukan")

    if current_user.role != "super_admin" and kb.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Akses ditolak")

    for field, value in kb_in.model_dump(exclude_unset=True).items():
        setattr(kb, field, value)

    await db.commit()
    await db.refresh(kb)

    await _add_to_chroma(str(kb.tenant_id), kb, db)

    try:
        invalidate_cache(str(kb.tenant_id))
    except Exception:
        pass

    return kb


@router.delete("/{knowledge_id}", status_code=204)
async def delete_knowledge(
    knowledge_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(KnowledgeBase).where(KnowledgeBase.id == knowledge_id)
    )
    kb = result.scalars().first()

    if not kb:
        raise HTTPException(status_code=404, detail="Knowledge Base tidak ditemukan")

    if current_user.role != "super_admin" and kb.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Akses ditolak")

    t_id = str(kb.tenant_id)
    kb_id = str(kb.id)

    await db.delete(kb)
    await db.commit()

    await _delete_from_chroma(t_id, kb_id)

    try:
        invalidate_cache(t_id)
    except Exception:
        pass

    return None