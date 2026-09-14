from uuid import UUID
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, text
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, timezone
import json
import random
import string
import asyncio
import re
import logging

from app.api.deps import get_db, get_current_user
from app.models.chatbot import ChatSession, ChatMessage, ChatReview
from app.models.knowledge import KnowledgeBase
from app.models.tenant import Tenant
from app.models.user import User
from app.models.usage import UsageToken
from app.utils.crypto import decrypt_api_key
from app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatMessageCreate,
    ChatMessageResponse,
    ChatReviewCreate,
    ChatReviewResponse,
    TrendingTopicResponse,
    ChatPublicQueryRequest,
    ChatPublicQueryResponse
)
from app.services.gemini_service import generate_response
from app.services.cache_service import (
    get_cached_response, 
    set_cached_response, 
    get_cache_stats, 
    invalidate_cache, 
    clear_all_cache
)
from app.services.rag_service import RAGService
from app.services.llm_provider import LLMProviderFactory
from app.services.token_counter import count_tokens, estimate_cost, log_token_usage
from app.core.config import settings

# Setup logger
logger = logging.getLogger(__name__)

def get_usage_type(request_path: str) -> str:
    """Menentukan jenis penggunaan berdasarkan endpoint"""
    if "/query/stream" in request_path:
        return "Stream"
    elif "/query" in request_path:
        return "Query"
    elif "/embedding" in request_path:
        return "Embedding"
    elif "/rag" in request_path:
        return "RAG"
    elif "/chat" in request_path:
        return "Chat"
    return "Query"

router = APIRouter()

# ===== FUNGSI DETEKSI SESSION EXPIRED =====
async def check_and_update_expired_sessions(db: AsyncSession):
    """
    Update status session.
    
    LOGIKA:
    - User tanya 1x → TERPUTUS
    - User tanya 2x atau lebih → SELESAI
    - User tanya berkali-kali lalu pergi → SELESAI
    """
    timeout_seconds = 120
    cutoff_time = datetime.now(timezone.utc) - timedelta(seconds=timeout_seconds)
    
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.status == "Selesai",
            ChatSession.last_heartbeat < cutoff_time
        )
    )
    sessions = result.scalars().all()
    
    updated = 0
    for session in sessions:
        msg_result = await db.execute(
            select(func.count()).where(
                ChatMessage.session_id == session.id,
                ChatMessage.sender == "user"
            )
        )
        user_message_count = msg_result.scalar() or 0

        if user_message_count == 1:
            session.status = "Terputus"
            updated += 1
            logger.info(f"{session.session_code} -> Terputus (1 pesan user)")
        else:
            logger.info(f"{session.session_code} -> Selesai ({user_message_count} pesan user)")

        if session.created_at and session.last_heartbeat:
            delta = session.last_heartbeat - session.created_at
            total_sec = int(delta.total_seconds())
            if total_sec > 0:
                session.duration = f"{total_sec // 60}m {total_sec % 60}s"
    
    if updated:
        await db.commit()
        logger.info(f"Total {updated} session diupdate menjadi Terputus")
    
    return updated


# ===== CACHE STATISTICS =====
@router.get("/cache/stats")
async def get_cache_stats_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get cache statistics (super admin only)"""
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Hanya super admin yang bisa melihat statistik cache")
    
    stats = get_cache_stats()
    return stats


# ===== CLEAR CACHE =====
@router.post("/cache/clear")
async def clear_cache_endpoint(
    tenant_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Clear cache (super admin only)"""
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Hanya super admin yang bisa clear cache")
    
    if tenant_id:
        invalidate_cache(str(tenant_id))
        return {"message": f"Cache untuk tenant {tenant_id} telah dihapus", "tenant_id": str(tenant_id)}
    else:
        clear_all_cache()
        return {"message": "Semua cache telah dihapus", "cleared": "all"}


# ===== TOKEN USAGE STATISTICS =====
@router.get("/tokens/stats")
async def get_token_stats(
    tenant_id: Optional[UUID] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get token usage statistics"""
    params = {}
    tenant_filter = ""
    date_filter = ""
    
    if current_user.role != "super_admin":
        tenant_filter = " AND tenant_id = :tenant_id"
        params["tenant_id"] = current_user.tenant_id
    elif tenant_id:
        tenant_filter = " AND tenant_id = :tenant_id"
        params["tenant_id"] = tenant_id
    
    if start_date:
        date_filter += " AND created_at >= :start_date"
        params["start_date"] = start_date
    if end_date:
        date_filter += " AND created_at <= :end_date"
        params["end_date"] = end_date
    
    query = text(f"""
        SELECT 
            tenant_id,
            type,
            SUM(prompt_tokens) as total_prompt_tokens,
            SUM(completion_tokens) as total_completion_tokens,
            SUM(total_tokens) as total_tokens,
            COUNT(*) as total_requests,
            DATE(created_at) as date
        FROM usage_tokens
        WHERE 1=1 {tenant_filter} {date_filter}
        GROUP BY tenant_id, type, DATE(created_at)
        ORDER BY date DESC
    """)
    
    result = await db.execute(query, params)
    rows = result.all()
    
    # Calculate cost estimates
    total_tokens = sum(r.total_tokens or 0 for r in rows)
    cost_estimate = estimate_cost(total_tokens, provider='google_gemini')
    
    return {
        "total_tokens": total_tokens,
        "total_requests": sum(r.total_requests or 0 for r in rows),
        "cost_estimate": cost_estimate,
        "breakdown": [
            {
                "tenant_id": str(r.tenant_id),
                "date": str(r.date),
                "type": r.type,
                "prompt_tokens": r.total_prompt_tokens or 0,
                "completion_tokens": r.total_completion_tokens or 0,
                "total_tokens": r.total_tokens or 0,
                "requests": r.total_requests or 0
            }
            for r in rows
        ]
    }


# ===== ANALYTICS DASHBOARD =====
@router.get("/analytics")
async def get_chat_analytics(
    tenant_id: Optional[UUID] = None,
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Dashboard analytics untuk admin"""
    
    # Filter tenant
    if current_user.role != "super_admin":
        tenant_filter = f"tenant_id = '{current_user.tenant_id}'"
    elif tenant_id:
        tenant_filter = f"tenant_id = '{tenant_id}'"
    else:
        tenant_filter = "1=1"
    
    # 1. Total sessions
    query = text(f"""
        SELECT COUNT(*) as total FROM chat_sessions WHERE {tenant_filter}
    """)
    total_sessions = (await db.execute(query)).scalar() or 0
    
    # 2. Total messages
    query = text(f"""
        SELECT COUNT(*) as total FROM chat_messages cm
        JOIN chat_sessions cs ON cm.session_id = cs.id
        WHERE {tenant_filter}
    """)
    total_messages = (await db.execute(query)).scalar() or 0
    
    # 3. Jailbreak count
    query = text(f"""
        SELECT COUNT(*) as total FROM chat_sessions 
        WHERE {tenant_filter} AND jailbreak = true
    """)
    jailbreak_count = (await db.execute(query)).scalar() or 0
    
    # 4. Unique users
    query = text(f"""
        SELECT COUNT(DISTINCT user_name) as total FROM chat_sessions 
        WHERE {tenant_filter} AND user_name IS NOT NULL
    """)
    unique_users = (await db.execute(query)).scalar() or 0
    
    # 5. Messages per day (last N days)
    query = text(f"""
        SELECT 
            DATE(cm.created_at) as date,
            COUNT(*) as count,
            COUNT(CASE WHEN cm.sender = 'user' THEN 1 END) as user_msgs,
            COUNT(CASE WHEN cm.sender = 'ai' THEN 1 END) as ai_msgs
        FROM chat_messages cm
        JOIN chat_sessions cs ON cm.session_id = cs.id
        WHERE {tenant_filter}
            AND cm.created_at >= NOW() - INTERVAL '{days} days'
        GROUP BY DATE(cm.created_at)
        ORDER BY date DESC
    """)
    daily_stats = (await db.execute(query)).all()
    
    # 6. Top topics
    query = text(f"""
        SELECT 
            topic,
            COUNT(*) as count
        FROM chat_sessions
        WHERE {tenant_filter} AND topic IS NOT NULL
        GROUP BY topic
        ORDER BY count DESC
        LIMIT 5
    """)
    top_topics = (await db.execute(query)).all()
    
    # 7. Average response time (estimated from AI messages length)
    query = text(f"""
        SELECT 
            AVG(LENGTH(text)) as avg_length
        FROM chat_messages cm
        JOIN chat_sessions cs ON cm.session_id = cs.id
        WHERE {tenant_filter} AND cm.sender = 'ai'
    """)
    avg_length = (await db.execute(query)).scalar() or 0
    
    return {
        "overview": {
            "total_sessions": total_sessions,
            "total_messages": total_messages,
            "jailbreak_count": jailbreak_count,
            "jailbreak_percentage": round(jailbreak_count / max(total_sessions, 1) * 100, 2),
            "unique_users": unique_users,
            "avg_response_length": round(avg_length, 0)
        },
        "daily_stats": [
            {
                "date": str(row.date),
                "total": row.count,
                "user_messages": row.user_msgs,
                "ai_messages": row.ai_msgs
            }
            for row in daily_stats
        ],
        "top_topics": [
            {"topic": row.topic or "Umum", "count": row.count}
            for row in top_topics
        ]
    }


# ===== CLEANUP OLD SESSIONS =====
@router.post("/sessions/cleanup")
async def cleanup_old_sessions(
    days: int = Query(7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Hapus sesi yang sudah lebih dari N hari (admin only)"""
    if current_user.role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang bisa melakukan cleanup")
    
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
    # Dapatkan sesi yang akan dihapus
    result = await db.execute(
        select(ChatSession).where(ChatSession.created_at < cutoff)
    )
    old_sessions = result.scalars().all()
    
    if current_user.role != "super_admin":
        old_sessions = [s for s in old_sessions if s.tenant_id == current_user.tenant_id]
    
    count = 0
    for session in old_sessions:
        # Hapus messages
        await db.execute(
            text("DELETE FROM chat_messages WHERE session_id = :id"),
            {"id": session.id}
        )
        # Hapus reviews
        await db.execute(
            text("DELETE FROM chat_reviews WHERE session_id = :id"),
            {"id": session.id}
        )
        # Hapus session
        await db.delete(session)
        count += 1
    
    await db.commit()
    
    return {
        "message": f"Berhasil menghapus {count} sesi yang lebih dari {days} hari",
        "deleted_sessions": count,
        "days_threshold": days
    }


# ===== GET SESSIONS =====
@router.get("/sessions")
async def list_chat_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    tenant_id: Optional[UUID] = None,
    facility_name: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(ChatSession)
    
    if current_user.role != "super_admin":
        query = query.where(ChatSession.tenant_id == current_user.tenant_id)
    elif tenant_id is not None:
        query = query.where(ChatSession.tenant_id == tenant_id)
    elif facility_name is not None and facility_name != "Semua Fasilitas":
        query = query.where(ChatSession.facility_name == facility_name)

    if status and status != "Semua Status":
        query = query.where(ChatSession.status == status)

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            (ChatSession.user_name.ilike(search_pattern)) |
            (ChatSession.topic.ilike(search_pattern)) |
            (ChatSession.session_code.ilike(search_pattern))
        )

    query = query.order_by(desc(ChatSession.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    sessions = result.scalars().all()
    
    count_query = select(func.count()).select_from(ChatSession)
    if current_user.role != "super_admin":
        count_query = count_query.where(ChatSession.tenant_id == current_user.tenant_id)
    elif tenant_id is not None:
        count_query = count_query.where(ChatSession.tenant_id == tenant_id)
    elif facility_name is not None and facility_name != "Semua Fasilitas":
        count_query = count_query.where(ChatSession.facility_name == facility_name)
    if status and status != "Semua Status":
        count_query = count_query.where(ChatSession.status == status)
    if search:
        search_pattern = f"%{search}%"
        count_query = count_query.where(
            (ChatSession.user_name.ilike(search_pattern)) |
            (ChatSession.topic.ilike(search_pattern)) |
            (ChatSession.session_code.ilike(search_pattern))
        )
    
    total_result = await db.execute(count_query)
    total = total_result.scalar()
    
    result_data = []
    for session in sessions:
        msg_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session.id)
            .order_by(ChatMessage.created_at.asc())
        )
        messages = msg_result.scalars().all()
        
        if session.created_at and session.last_heartbeat:
            delta = session.last_heartbeat - session.created_at
            total_sec = max(0, int(delta.total_seconds()))
            minutes = total_sec // 60
            seconds = total_sec % 60
            calculated_duration = f"{minutes}m {seconds}s"
        elif session.duration and session.duration != "0m 00s":
            calculated_duration = session.duration
        else:
            calculated_duration = "0m 00s"
        
        result_data.append({
            "id": session.id,
            "session_code": session.session_code,
            "created_at": session.created_at,
            "user_name": session.user_name or "Warga Anonim",
            "facility_name": session.facility_name or "Pusat",
            "duration": calculated_duration,
            "topic": session.topic or "Umum",
            "status": session.status or "Selesai",
            "jailbreak": session.jailbreak or False,
            "similarity_score": session.similarity_score or 0,
            "messages": [
                {
                    "sender": msg.sender,
                    "text": msg.text,
                    "time_str": msg.time_str,
                    "is_jailbreak": msg.is_jailbreak or False
                }
                for msg in messages
            ]
        })
    
    return {
        "data": result_data,
        "pagination": {
            "skip": skip,
            "limit": limit,
            "total": total,
            "next": skip + limit if skip + limit < total else None
        }
    }


# ===== HEARTBEAT =====
@router.post("/heartbeat")
async def chat_heartbeat(
    payload: dict,
    db: AsyncSession = Depends(get_db)
):
    session_code = payload.get('session_code')
    if not session_code:
        raise HTTPException(status_code=400, detail="session_code required")
    
    result = await db.execute(
        select(ChatSession).where(ChatSession.session_code == session_code)
    )
    session = result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.last_heartbeat = datetime.now(timezone.utc)
    await db.commit()
    
    print(f"Heartbeat untuk {session_code} diupdate")
    
    return {"status": "ok", "session_code": session_code}


# ===== CREATE SESSION =====
@router.post("/sessions", response_model=ChatSessionResponse, status_code=201)
async def create_chat_session(
    session_in: ChatSessionCreate,
    db: AsyncSession = Depends(get_db)
):
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == session_in.tenant_id))
    tenant = tenant_result.scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant tidak ditemukan")

    existing = await db.execute(
        select(ChatSession).where(ChatSession.session_code == session_in.session_code)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="Session code sudah ada")

    session = ChatSession(
        session_code=session_in.session_code,
        tenant_id=session_in.tenant_id,
        user_name=session_in.user_name or "Warga Anonim",
        facility_name=session_in.facility_name or tenant.nama_dinas,
        duration=session_in.duration or "0m 0s",
        topic=session_in.topic or "Umum",
        status=session_in.status or "Selesai",
        jailbreak=session_in.jailbreak or False,
        last_heartbeat=datetime.now(timezone.utc),
    )
    db.add(session)
    await db.flush()

    if session_in.messages:
        for msg in session_in.messages:
            db_msg = ChatMessage(
                session_id=session.id,
                sender=msg.sender,
                text=msg.text,
                time_str=msg.time_str,
                is_jailbreak=msg.is_jailbreak or False
            )
            db.add(db_msg)

    tenant.sesi_chat += 1
    await db.commit()

    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session.id)
    )
    return result.scalars().first()


# ===== GET MESSAGES =====
@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_session_messages(
    session_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session_id).order_by(ChatMessage.created_at.asc())
    )
    return result.scalars().all()


# ===== ADD MESSAGE =====
@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse, status_code=201)
async def add_session_message(
    session_id: UUID,
    msg_in: ChatMessageCreate,
    db: AsyncSession = Depends(get_db)
):
    session_result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    session = session_result.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesi percakapan tidak ditemukan")

    msg = ChatMessage(
        session_id=session_id,
        sender=msg_in.sender,
        text=msg_in.text,
        time_str=msg_in.time_str,
        is_jailbreak=msg_in.is_jailbreak or False
    )
    if msg_in.is_jailbreak:
        session.jailbreak = True
        session.status = "Butuh Evaluasi"

    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


# ===== REVIEWS =====
@router.get("/reviews", response_model=List[ChatReviewResponse])
async def list_chat_reviews(
    tenant_id: Optional[UUID] = None,
    is_positive: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(ChatReview)
    if current_user.role != "super_admin":
        query = query.where(ChatReview.tenant_id == current_user.tenant_id)
    elif tenant_id is not None:
        query = query.where(ChatReview.tenant_id == tenant_id)

    if is_positive is not None:
        query = query.where(ChatReview.is_positive == is_positive)

    result = await db.execute(query.order_by(ChatReview.created_at.desc()))
    return result.scalars().all()


@router.post("/reviews", response_model=ChatReviewResponse, status_code=201)
async def create_chat_review(
    review_in: ChatReviewCreate,
    db: AsyncSession = Depends(get_db)
):
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == review_in.tenant_id))
    tenant = tenant_result.scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant tidak ditemukan")

    review = ChatReview(
        review_code=review_in.review_code,
        session_id=review_in.session_id,
        tenant_id=review_in.tenant_id,
        user_name=review_in.user_name or "Warga",
        facility_name=review_in.facility_name or tenant.nama_dinas,
        is_positive=review_in.is_positive,
        text=review_in.text
    )
    db.add(review)
    await db.commit()
    await db.refresh(review)
    return review


# ===== TRENDING =====
@router.get("/trending", response_model=List[TrendingTopicResponse])
async def get_trending_topics(
    tenant_id: Optional[UUID] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(
        ChatSession.topic,
        func.count(ChatSession.id).label("count")
    ).group_by(ChatSession.topic)

    if current_user.role != "super_admin":
        query = query.where(ChatSession.tenant_id == current_user.tenant_id)
    elif tenant_id is not None:
        query = query.where(ChatSession.tenant_id == tenant_id)

    result = await db.execute(query.order_by(func.count(ChatSession.id).desc()).limit(5))
    rows = result.all()

    trending_list = []
    for row in rows:
        topic_name = row[0] or "Layanan Umum"
        cnt = row[1]
        trending_list.append({
            "topic": topic_name,
            "count": cnt,
            "rating": 90
        })

    return trending_list


# ===== DELETE SESSION =====
@router.delete("/sessions/{session_id}")
async def delete_chat_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(ChatSession).where(ChatSession.id == session_id)
    )
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Sesi chat tidak ditemukan")
    
    if current_user.role != "super_admin" and session.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=403, detail="Anda tidak memiliki akses untuk menghapus sesi ini")
    
    await db.delete(session)
    await db.commit()
    
    return {
        "message": "Sesi chat berhasil dihapus",
        "session_id": str(session_id),
        "session_code": session.session_code
    }


def detect_jailbreak(text_content: str) -> bool:
    """Deteksi percobaan prompt injection, jailbreak, dan niat jahat"""
    if not text_content:
        return False
    lower = text_content.lower()
    suspicious_patterns = [
        r"ignore\s+previous\s+instructions",
        r"abaikan\s+instruksi\s+sebelumnya",
        r"lupakan\s+instruksi",
        r"system\s+prompt",
        r"reveal\s+your\s+prompt",
        r"tampilkan\s+prompt",
        
        r"jailbreak",
        r"bypass\s+security",
        r"bypass\s+filter",
        r"disable\s+safety",
        r"matikan\s+keamanan",
        
        r"meretas",
        r"retas",
        r"bobol",
        r"hack\s+server",
        r"hacking",
        r"crack\s+password",
        r"bobol\s+password",
        r"bobol\s+akun",
        r"curi\s+data",
        r"curi\s+password",
        r"carding",
        r"phising",
        r"phishing",
        r"ddos",
        r"defacing",
        r"defacing\s+website",
        
        r"drop\s+table",
        r"sql\s+injection",
        r"eval\(",
        r"exec\(",
        r"passthrough",
        r"<script>",
        r"javascript:",
        
        r"exploit\s+vulnerability",
        r"remote\s+code\s+execution",
        r"rce\s+exploit",
        r"backdoor",
    ]
    for pattern in suspicious_patterns:
        if re.search(pattern, lower):
            logger.warning(f"🚨 Jailbreak pattern detected: {pattern}")
            return True
    return False

# ===== CHAT QUERY =====
@router.post("/query", response_model=ChatPublicQueryResponse)
async def query_public_chatbot(
    request: Request,
    payload: ChatPublicQueryRequest,
    db: AsyncSession = Depends(get_db)
):
    await check_and_update_expired_sessions(db)
    
    code = (payload.tenant_code or "dinkes").strip().lower()
    tenant_res = await db.execute(select(Tenant).where(func.lower(Tenant.kode_dinas) == code))
    tenant = tenant_res.scalars().first()
    
    if not tenant:
        t_all = await db.execute(select(Tenant))
        tenant = t_all.scalars().first()

    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant tidak ditemukan")

    query_text = payload.message.strip()
    tenant_id_str = str(tenant.id)
    jailbreak_detected = detect_jailbreak(query_text)
    
    # ===== CEK CACHE =====
    cached_answer = get_cached_response(tenant_id_str, query_text) if not jailbreak_detected else None
    
    if cached_answer:
        logger.info(f"Cache HIT: {query_text[:30]}...")
        ai_answer = cached_answer
        matched_article = None
        detected_topic = "Umum"
        similarity_score = 0.0
        context = ""
    else:
        # ===== HYBRID RAG SEARCH =====
        rag_service = RAGService(db=db, tenant_id=tenant.id)
        rag_results = await rag_service.search(query_text, top_k=3)
        context = rag_service.get_context(rag_results)
        
        matched_article = rag_results[0]['judul'] if rag_results else None
        similarity_score = rag_results[0]['score'] if rag_results else 0.0
        detected_topic = rag_results[0]['kategori'] if rag_results else "Umum"

        system_prompt = tenant.system_prompt or f"""
Kamu adalah asisten AI resmi untuk {tenant.nama_dinas}.
Bersikap profesional, ramah, dan informatif.
Gunakan bahasa Indonesia yang baik dan mudah dipahami.

ATURAN FORMAT JAWABAN (PENTING!):
1. Jawab dengan bahasa natural dan mudah dibaca.
2. JANGAN gunakan format markdown yang berlebihan.
3. JANGAN gunakan **bold** kecuali sangat penting (max 2-3 kata).
4. JANGAN gunakan heading (###, ##, #).
5. JANGAN gunakan code block.
6. Untuk list, gunakan format sederhana: "- " atau "1. ".
7. JAWAB DENGAN LENGKAP! Jangan terpotong di tengah kalimat.
8. Minimal 3 kalimat, maksimal 8 kalimat.
9. Jika perlu list, maksimal 5-6 item saja.
"""

        if jailbreak_detected:
            ai_answer = "⚠️ Pertanyaan Anda mengandung indikasi percobaan manipulasi instruksi sistem. Permintaan ditolak."
            detected_topic = "Security Alert"
        else:
            try:
                factory = LLMProviderFactory(tenant=tenant)
                full_prompt = f"""
**Knowledge Base (Referensi):**
{context if context else "Tidak ada referensi khusus."}

**Pertanyaan Warga:**
{query_text}

**Instruksi:**
1. Jawab pertanyaan berdasarkan Knowledge Base jika relevan.
2. Jika tidak ada di Knowledge Base, jawab dengan sopan dan informatif.
3. Jawab dengan LENGKAP dan TUNTAS (3-8 kalimat).
4. Gunakan bahasa Indonesia yang baik.
5. HINDARI markdown berlebihan: jangan pakai **bold** kecuali penting.
6. Untuk list, pakai format: "- " atau "1. ", maksimal 5-6 item.
7. JANGAN pakai heading (###, ##, #) atau code block.
8. PASTIKAN jawaban tidak terpotong di tengah kalimat.
"""
                try:
                    ai_answer, used_provider = await asyncio.wait_for(
                        factory.generate(
                            full_prompt, 
                            system_prompt=system_prompt,
                            max_tokens=2000,
                            temperature=0.7
                        ),
                        timeout=60.0
                    )
                    logger.info(f"AI Response generated using: {used_provider}")
                    
                except asyncio.TimeoutError:
                    logger.error(f"LLM timeout for query: {query_text[:50]}...")
                    ai_answer = "Maaf, permintaan memakan waktu terlalu lama. Silakan coba lagi."
                    used_provider = "timeout"
                
                # Validasi jawaban
                if not ai_answer or len(ai_answer.strip()) < 5:
                    logger.warning(f"Empty response from LLM for query: {query_text[:50]}...")
                    if context:
                        ai_answer = f"Berdasarkan informasi resmi dari '{matched_article}':\n\n{context[:500]}..."
                    else:
                        ai_answer = "Maaf, saya tidak dapat memberikan jawaban yang memadai saat ini."

                if ai_answer and len(ai_answer) > 10 and not ai_answer.startswith("⚠️"):
                    set_cached_response(tenant_id_str, query_text, ai_answer)
                    
            except ValueError as ve:
                logger.error(f"LLM Factory Error: {ve}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Konfigurasi AI tidak lengkap untuk tenant {tenant.nama_dinas}. Silakan hubungi admin."
                )
            except Exception as e:
                logger.error(f"LLM generation error: {e}")
                if context:
                    ai_answer = f"Berdasarkan informasi resmi dari '{matched_article}':\n\n{context[:500]}..."
                else:
                    ai_answer = f"Saya asisten AI {tenant.nama_dinas}. Maaf, saat ini layanan AI sedang mengalami gangguan sementara."

    # ===== UPDATE TOPIC DETECTED =====
    if "ktp" in query_text.lower():
        detected_topic = "KTP & Kependudukan"
    elif "kominfo" in query_text.lower():
        detected_topic = "Layanan Kominfo"
    elif "aksara" in query_text.lower():
        detected_topic = "Platform AKSARA"
    if jailbreak_detected:
        detected_topic = "Security Alert"

    # ===== SIMPAN KE DATABASE (SESSION & MESSAGES) =====
    session_code = payload.session_code
    session = None

    if session_code:
        s_res = await db.execute(select(ChatSession).where(ChatSession.session_code == session_code))
        session = s_res.scalars().first()

    if not session:
        session_code = f"SES-{''.join(random.choices(string.digits, k=4))}"
        session_status = "Butuh Evaluasi" if jailbreak_detected else "Selesai"
        session_topic = query_text[:60] + "..." if len(query_text) > 60 else query_text

        session = ChatSession(
            session_code=session_code,
            tenant_id=tenant.id,
            user_name=payload.user_name or "Warga Anonim",
            facility_name=tenant.nama_dinas,
            duration="0m 00s",
            topic=session_topic,
            status=session_status,
            jailbreak=jailbreak_detected,
            last_heartbeat=datetime.now(timezone.utc),
            similarity_score=round(similarity_score, 2)
        )
        db.add(session)
        tenant.sesi_chat += 1
        await db.flush()
    else:
        if jailbreak_detected:
            session.jailbreak = True
            session.status = "Butuh Evaluasi"
        session.similarity_score = round(similarity_score, 2)

    now_str = datetime.now(timezone.utc).strftime("%H:%M %p")
    user_msg = ChatMessage(
        session_id=session.id,
        sender="user",
        text=payload.message,
        time_str=now_str,
        is_jailbreak=jailbreak_detected
    )
    ai_msg = ChatMessage(
        session_id=session.id,
        sender="ai",
        text=ai_answer,
        time_str=now_str,
        is_jailbreak=False
    )
    db.add(user_msg)
    db.add(ai_msg)
    
    session.last_heartbeat = datetime.now(timezone.utc)

    # ===== TOKEN USAGE TRACKING =====
    try:
        p_tokens = count_tokens(query_text)
        c_tokens = count_tokens(ai_answer)
        total_toks = p_tokens + c_tokens
        
        usage_type = get_usage_type(request.url.path)
        
        usage_log = UsageToken(
            id=uuid.uuid4(),
            tenant_id=tenant.id,
            type=usage_type,
            prompt_tokens=p_tokens,
            completion_tokens=c_tokens,
            total_tokens=total_toks,
            created_at=datetime.now(timezone.utc)
        )
        db.add(usage_log)
    except Exception as e:
        logger.error(f"Gagal mencatat token usage: {e}")

    await db.commit()

    return {
        "session_code": session_code,
        "answer": ai_answer,
        "topic": detected_topic,
        "matched_article": matched_article,
        "similarity_score": round(similarity_score * 100, 2)
    }


# ===== CHAT QUERY STREAM (REAL-TIME PUBLIC SSE) =====
@router.post("/query/stream")
async def query_public_chatbot_stream(
    payload: ChatPublicQueryRequest,
    db: AsyncSession = Depends(get_db)
):
    code = (payload.tenant_code or "dinkes").strip().lower()
    tenant_res = await db.execute(select(Tenant).where(func.lower(Tenant.kode_dinas) == code))
    tenant = tenant_res.scalars().first()
    if not tenant:
        t_all = await db.execute(select(Tenant))
        tenant = t_all.scalars().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant tidak ditemukan")

    query_text = payload.message.strip()
    jailbreak_detected = detect_jailbreak(query_text)

    # Hybrid RAG Context
    rag_service = RAGService(db=db, tenant_id=tenant.id)
    rag_results = await rag_service.search(query_text, top_k=3)
    context = rag_service.get_context(rag_results)
    matched_article = rag_results[0]['judul'] if rag_results else None
    similarity_score = rag_results[0]['score'] if rag_results else 0.0
    detected_topic = rag_results[0]['kategori'] if rag_results else "Umum"

    system_prompt = tenant.system_prompt or f"""
Kamu adalah asisten AI resmi untuk {tenant.nama_dinas}.
Bersikap profesional, ramah, dan informatif.
Gunakan bahasa Indonesia yang baik dan mudah dipahami.

ATURAN FORMAT JAWABAN (PENTING!):
1. Jawab dengan bahasa natural dan mudah dibaca.
2. JANGAN gunakan format markdown yang berlebihan.
3. JANGAN gunakan **bold** kecuali sangat penting (max 2-3 kata).
4. JANGAN gunakan heading (###, ##, #).
5. JANGAN gunakan code block.
6. Untuk list, gunakan format sederhana: "- " atau "1. ".
7. JAWAB DENGAN LENGKAP! Jangan terpotong di tengah kalimat.
8. Minimal 3 kalimat, maksimal 8 kalimat.
9. Jika perlu list, maksimal 5-6 item saja.
"""

    full_prompt = f"""
**Knowledge Base (Referensi):**
{context if context else "Tidak ada referensi khusus."}

**Pertanyaan Warga:**
{query_text}

**Instruksi:**
1. Jawab pertanyaan berdasarkan Knowledge Base jika relevan.
2. Jika tidak ada di Knowledge Base, jawab dengan sopan dan informatif.
3. Jawab dengan LENGKAP dan TUNTAS (3-8 kalimat).
4. Gunakan bahasa Indonesia yang baik.
5. HINDARI markdown berlebihan: jangan pakai **bold** kecuali penting.
6. Untuk list, pakai format: "- " atau "1. ", maksimal 5-6 item.
7. JANGAN pakai heading (###, ##, #) atau code block.
8. PASTIKAN jawaban tidak terpotong di tengah kalimat.
"""

    async def event_generator():
        full_text_accumulated = ""
        used_provider = "unknown"

        if jailbreak_detected:
            msg = "⚠️ Pertanyaan Anda mengandung indikasi percobaan manipulasi instruksi sistem."
            yield f"data: {json.dumps({'type': 'content', 'content': msg})}\n\n"
            full_text_accumulated = msg
        else:
            try:
                # ===== GENERATE STREAM DENGAN FACTORY (NO HARCODE!) =====
                factory = LLMProviderFactory(tenant=tenant)
                
                async def stream_with_timeout():
                    # NAIKKAN max_tokens untuk streaming
                    async for chunk, prov in factory.generate_stream(
                        full_prompt, 
                        system_prompt=system_prompt,
                        max_tokens=2000,    
                        temperature=0.7  
                    ):
                        yield chunk, prov
                
                async for chunk, prov in stream_with_timeout():
                    used_provider = prov
                    full_text_accumulated += chunk
                    yield f"data: {json.dumps({'type': 'content', 'content': chunk})}\n\n"
                    
            except ValueError as ve:
                # Error validasi dari LLMProviderFactory
                logger.error(f"🚨 LLM Factory Error in stream: {ve}")
                error_msg = "⚠️ Konfigurasi AI tidak lengkap. Silakan hubungi admin."
                yield f"data: {json.dumps({'type': 'error', 'content': error_msg})}\n\n"
                full_text_accumulated = error_msg
                
            except asyncio.TimeoutError:
                logger.error(f"⏰ Stream timeout for query: {query_text[:50]}...")
                fallback_answer = "Maaf, permintaan memakan waktu terlalu lama. Silakan coba lagi."
                yield f"data: {json.dumps({'type': 'content', 'content': fallback_answer})}\n\n"
                full_text_accumulated = fallback_answer
                
            except Exception as e:
                logger.error(f"❌ Stream LLM failed: {e}")
                if context:
                    fallback_answer = f"Berdasarkan informasi resmi dari '{matched_article}':\n\n{context}"
                else:
                    fallback_answer = f"Saya asisten AI {tenant.nama_dinas}. Saat ini saya belum menemukan informasi spesifik tentang pertanyaan Anda."
                
                words = fallback_answer.split(" ")
                for i, w in enumerate(words):
                    c = w + (" " if i < len(words) - 1 else "")
                    full_text_accumulated += c
                    yield f"data: {json.dumps({'type': 'content', 'content': c})}\n\n"

        # Simpan ke database setelah selesai streaming
        try:
            session_code = payload.session_code
            session = None
            
            if session_code:
                s_res = await db.execute(select(ChatSession).where(ChatSession.session_code == session_code))
                session = s_res.scalars().first()
            
            if not session:
                session_code = f"SES-{''.join(random.choices(string.digits, k=4))}"
                session = ChatSession(
                    session_code=session_code,
                    tenant_id=tenant.id,
                    user_name=payload.user_name or "Warga Anonim",
                    facility_name=tenant.nama_dinas,
                    duration="0m 00s",
                    topic=query_text[:60] + "..." if len(query_text) > 60 else query_text,
                    status="Selesai",
                    jailbreak=jailbreak_detected,
                    last_heartbeat=datetime.now(timezone.utc),
                    similarity_score=round(similarity_score, 2)
                )
                db.add(session)
                tenant.sesi_chat += 1
                await db.flush()
            
            now_str = datetime.now(timezone.utc).strftime("%H:%M %p")
            user_msg = ChatMessage(
                session_id=session.id,
                sender="user",
                text=payload.message,
                time_str=now_str,
                is_jailbreak=jailbreak_detected
            )
            ai_msg = ChatMessage(
                session_id=session.id,
                sender="ai",
                text=full_text_accumulated,
                time_str=now_str,
                is_jailbreak=False
            )
            db.add(user_msg)
            db.add(ai_msg)
            
            session.last_heartbeat = datetime.now(timezone.utc)
            
            # Log token usage
            try:
                p_tokens = count_tokens(query_text)
                c_tokens = count_tokens(full_text_accumulated)
                usage_log = UsageToken(
                    id=uuid.uuid4(),
                    tenant_id=tenant.id,
                    type="Stream",
                    prompt_tokens=p_tokens,
                    completion_tokens=c_tokens,
                    total_tokens=p_tokens + c_tokens,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(usage_log)
            except Exception as e:
                logger.error(f"Gagal mencatat token usage stream: {e}")
            
            await db.commit()
            
        except Exception as e:
            logger.error(f"Error saving stream session: {e}")
            await db.rollback()

        # Final Event
        done_json = json.dumps({
            "type": "done",
            "session_code": session_code,
            "provider": used_provider,
            "topic": detected_topic,
            "similarity_score": round(similarity_score * 100, 2)
        })
        yield f"data: {done_json}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")