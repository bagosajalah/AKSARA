from uuid import UUID
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_
from sqlalchemy.orm import selectinload, joinedload
from datetime import datetime, timedelta, timezone

from app.api.deps import get_db, get_current_user
from app.models.tenant import Tenant
from app.models.user import User
from app.models.usage import UsageToken

router = APIRouter()


# ====== ENDPOINT BARU: GET TYPES ======
@router.get("/types")
async def get_usage_types(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of unique usage types for filter dropdown"""
    
    query = select(func.distinct(UsageToken.type))
    
    if current_user.role != "super_admin":
        query = query.where(UsageToken.tenant_id == current_user.tenant_id)
    
    result = await db.execute(query)
    types = result.scalars().all()
    
    # Mapping untuk frontend
    type_display = {
        'Chat': 'Chat Generation',
        'Chat Generation': 'Chat Generation',
        'Embedding': 'Embedding',
        'RAG': 'RAG'
    }
    
    # Tambahkan opsi "Semua Jenis"
    type_list = [{"value": "", "label": "Semua Jenis"}]
    for t in types:
        type_list.append({
            "value": t,
            "label": type_display.get(t, t)
        })
    
    return {
        "success": True,
        "data": type_list
    }


@router.get("/tokens")
async def get_token_usage(
    period: Optional[str] = Query("all", description="today, 7days, 30days, all"),
    tenant_id: Optional[UUID] = None,
    type: Optional[str] = Query(None, description="Chat, Embedding, RAG"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get token usage list with filters"""
    
    # Build query dengan joinedload untuk memuat relasi tenant
    query = select(UsageToken).options(joinedload(UsageToken.tenant))
    
    # Filter tenant
    if tenant_id:
        query = query.where(UsageToken.tenant_id == tenant_id)
    elif current_user.role != "super_admin":
        query = query.where(UsageToken.tenant_id == current_user.tenant_id)
    
    # Filter type
    if type:
        query = query.where(UsageToken.type == type)
    
    # Filter period
    now = datetime.now(timezone.utc)
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.where(UsageToken.created_at >= start_date)
    elif period == "7days":
        start_date = now - timedelta(days=7)
        query = query.where(UsageToken.created_at >= start_date)
    elif period == "30days":
        start_date = now - timedelta(days=30)
        query = query.where(UsageToken.created_at >= start_date)
    # else: "all" -> no date filter
    
    # Order by created_at desc
    query = query.order_by(desc(UsageToken.created_at))
    
    # Execute
    result = await db.execute(query)
    tokens = result.scalars().all()
    
    # Transform response
    response = []
    for token in tokens:
        # Ambil nama tenant dari relasi yang sudah dimuat
        tenant_name = "Unknown"
        if token.tenant:
            tenant_name = token.tenant.nama_dinas
            
        response.append({
            "id": str(token.id),
            "created_at": token.created_at.isoformat() if token.created_at else None,
            "tenant_name": tenant_name,
            "type": token.type,
            "prompt_tokens": token.prompt_tokens,
            "completion_tokens": token.completion_tokens,
            "total_tokens": token.total_tokens
        })
    
    return {
        "data": response,
        "total": len(response)
    }


@router.get("/summary")
async def get_usage_summary(
    period: Optional[str] = Query("today", description="today, 7days, 30days, all"),
    tenant_id: Optional[UUID] = None,
    type: Optional[str] = Query(None, description="Chat, Embedding, RAG"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get aggregated usage summary for dashboard"""
    
    # ========== QUERY UNTUK TOTAL TOKEN ==========
    query = select(
        func.sum(UsageToken.total_tokens).label("total_tokens"),
        func.count(UsageToken.id).label("total_entries"),
        func.avg(UsageToken.total_tokens).label("avg_tokens")
    )
    
    # Filters untuk total token
    conditions = []
    
    if tenant_id:
        conditions.append(UsageToken.tenant_id == tenant_id)
    elif current_user.role != "super_admin":
        conditions.append(UsageToken.tenant_id == current_user.tenant_id)
    
    # Filter type (TAMBAHKAN)
    if type:
        conditions.append(UsageToken.type == type)
    
    # Period filter
    now = datetime.now(timezone.utc)
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        conditions.append(UsageToken.created_at >= start_date)
    elif period == "7days":
        start_date = now - timedelta(days=7)
        conditions.append(UsageToken.created_at >= start_date)
    elif period == "30days":
        start_date = now - timedelta(days=30)
        conditions.append(UsageToken.created_at >= start_date)
    # else: "all" -> no date filter
    
    if conditions:
        query = query.where(and_(*conditions))
    
    result = await db.execute(query)
    row = result.first()
    
    total_tokens = row.total_tokens or 0
    total_entries = row.total_entries or 0
    avg_tokens = int(row.avg_tokens or 0)
    
    # ========== QUERY UNTUK TOTAL SESSIONS ==========
    from app.models.chatbot import ChatSession
    
    session_query = select(func.count(ChatSession.id))
    
    if tenant_id:
        session_query = session_query.where(ChatSession.tenant_id == tenant_id)
    elif current_user.role != "super_admin":
        session_query = session_query.where(ChatSession.tenant_id == current_user.tenant_id)
    
    # Period filter untuk sessions
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        session_query = session_query.where(ChatSession.created_at >= start_date)
    elif period == "7days":
        start_date = now - timedelta(days=7)
        session_query = session_query.where(ChatSession.created_at >= start_date)
    elif period == "30days":
        start_date = now - timedelta(days=30)
        session_query = session_query.where(ChatSession.created_at >= start_date)
    
    session_result = await db.execute(session_query)
    total_sessions = session_result.scalar() or 0
    
    # ========== QUERY UNTUK RIWAYAT (DENGAN RELASI TENANT) ==========
    recent_query = select(UsageToken).options(joinedload(UsageToken.tenant)).order_by(desc(UsageToken.created_at))
    
    # Filter untuk riwayat
    if tenant_id:
        recent_query = recent_query.where(UsageToken.tenant_id == tenant_id)
    elif current_user.role != "super_admin":
        recent_query = recent_query.where(UsageToken.tenant_id == current_user.tenant_id)
    
    # Filter type untuk riwayat
    if type:
        recent_query = recent_query.where(UsageToken.type == type)
    
    # Period filter untuk riwayat
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        recent_query = recent_query.where(UsageToken.created_at >= start_date)
    elif period == "7days":
        start_date = now - timedelta(days=7)
        recent_query = recent_query.where(UsageToken.created_at >= start_date)
    elif period == "30days":
        start_date = now - timedelta(days=30)
        recent_query = recent_query.where(UsageToken.created_at >= start_date)
    
    # Batasi data terakhir
    recent_query = recent_query.limit(20)
    
    recent_result = await db.execute(recent_query)
    recent_tokens = recent_result.scalars().all()
    
    # ========== FORMAT RIWAYAT ==========
    riwayat = []
    for token in recent_tokens:
        # Ambil nama tenant dari relasi yang sudah dimuat
        tenant_name = "Unknown"
        if token.tenant:
            tenant_name = token.tenant.nama_dinas
            
        riwayat.append({
            "id": str(token.id),
            "created_at": token.created_at.isoformat() if token.created_at else None,
            "tenant_name": tenant_name,
            "type": token.type,
            "prompt_tokens": token.prompt_tokens,
            "completion_tokens": token.completion_tokens,
            "total_tokens": token.total_tokens
        })
    
    # ========== UNIQUE TENANTS ==========
    tenant_count_query = select(func.count(func.distinct(UsageToken.tenant_id)))
    tenant_conditions = []
    
    if tenant_id:
        tenant_conditions.append(UsageToken.tenant_id == tenant_id)
    elif current_user.role != "super_admin":
        tenant_conditions.append(UsageToken.tenant_id == current_user.tenant_id)
    
    if tenant_conditions:
        tenant_count_query = tenant_count_query.where(and_(*tenant_conditions))
    
    tenant_count_result = await db.execute(tenant_count_query)
    unique_tenants = tenant_count_result.scalar() or 0
    
    # ========== RESPONSE ==========
    return {
        "success": True,
        "data": {
            "total_sesi_chat": total_sessions,
            "total_token": total_tokens,
            "rata_rata_token": avg_tokens,
            "total_entries": total_entries,
            "unique_tenants": unique_tenants,
            "riwayat": riwayat
        }
    }


@router.get("/tenants/{tenant_id}")
async def get_tenant_usage(
    tenant_id: UUID,
    period: Optional[str] = Query("all", description="today, 7days, 30days, all"),
    type: Optional[str] = Query(None, description="Chat, Embedding, RAG"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get usage details for specific tenant"""
    
    # Check permission
    if current_user.role != "super_admin" and current_user.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Build query dengan joinedload
    query = select(UsageToken).options(joinedload(UsageToken.tenant)).where(UsageToken.tenant_id == tenant_id)
    
    # Filter type
    if type:
        query = query.where(UsageToken.type == type)
    
    # Period filter
    now = datetime.now(timezone.utc)
    if period == "today":
        start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.where(UsageToken.created_at >= start_date)
    elif period == "7days":
        start_date = now - timedelta(days=7)
        query = query.where(UsageToken.created_at >= start_date)
    elif period == "30days":
        start_date = now - timedelta(days=30)
        query = query.where(UsageToken.created_at >= start_date)
    
    query = query.order_by(desc(UsageToken.created_at))
    result = await db.execute(query)
    tokens = result.scalars().all()
    
    # Get tenant info
    tenant_result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = tenant_result.scalars().first()
    
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    # Get chat sessions count for this tenant
    from app.models.chatbot import ChatSession
    session_query = select(func.count(ChatSession.id)).where(ChatSession.tenant_id == tenant_id)
    
    if period == "today":
        start_date = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        session_query = session_query.where(ChatSession.created_at >= start_date)
    elif period == "7days":
        start_date = datetime.now(timezone.utc) - timedelta(days=7)
        session_query = session_query.where(ChatSession.created_at >= start_date)
    elif period == "30days":
        start_date = datetime.now(timezone.utc) - timedelta(days=30)
        session_query = session_query.where(ChatSession.created_at >= start_date)
    
    session_result = await db.execute(session_query)
    total_sessions = session_result.scalar() or 0
    
    # Format tokens
    tokens_list = []
    for token in tokens:
        tenant_name = "Unknown"
        if token.tenant:
            tenant_name = token.tenant.nama_dinas
            
        tokens_list.append({
            "id": str(token.id),
            "created_at": token.created_at.isoformat() if token.created_at else None,
            "tenant_name": tenant_name,
            "type": token.type,
            "prompt_tokens": token.prompt_tokens,
            "completion_tokens": token.completion_tokens,
            "total_tokens": token.total_tokens
        })
    
    return {
        "success": True,
        "data": {
            "tenant_id": str(tenant_id),
            "tenant_name": tenant.nama_dinas,
            "total_sessions": total_sessions,
            "total_usage_entries": len(tokens),
            "total_tokens": sum([t.total_tokens for t in tokens]),
            "average_tokens": int(sum([t.total_tokens for t in tokens]) / len(tokens)) if tokens else 0,
            "tokens": tokens_list
        }
    }


@router.get("/chart")
async def get_usage_chart(
    period: Optional[str] = Query("7days", description="7days, 30days"),
    tenant_id: Optional[UUID] = None,
    type: Optional[str] = Query(None, description="Chat, Embedding, RAG"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get usage data for chart visualization"""
    
    # Build query
    query = select(
        func.date(UsageToken.created_at).label("date"),
        func.sum(UsageToken.total_tokens).label("total_tokens"),
        func.count(UsageToken.id).label("count")
    )
    
    # Filters
    conditions = []
    
    if tenant_id:
        conditions.append(UsageToken.tenant_id == tenant_id)
    elif current_user.role != "super_admin":
        conditions.append(UsageToken.tenant_id == current_user.tenant_id)
    
    # Filter type (TAMBAHKAN)
    if type:
        conditions.append(UsageToken.type == type)
    
    # Period filter
    now = datetime.now(timezone.utc)
    if period == "7days":
        start_date = now - timedelta(days=7)
        conditions.append(UsageToken.created_at >= start_date)
    elif period == "30days":
        start_date = now - timedelta(days=30)
        conditions.append(UsageToken.created_at >= start_date)
    
    if conditions:
        query = query.where(and_(*conditions))
    
    query = query.group_by(func.date(UsageToken.created_at)).order_by(func.date(UsageToken.created_at))
    
    result = await db.execute(query)
    rows = result.all()
    
    return {
        "success": True,
        "data": {
            "labels": [str(row.date) for row in rows],
            "values": [int(row.total_tokens or 0) for row in rows],
            "counts": [int(row.count or 0) for row in rows]
        }
    }