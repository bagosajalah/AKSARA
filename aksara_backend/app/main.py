from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.api.v1.router import api_router
import logging
from datetime import datetime, timezone

import app.models.tenant
import app.models.user
import app.models.warga
import app.models.knowledge
import app.models.audit
import app.models.role
import app.models.user_role

# Setup logger
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

async def update_expired_sessions_background():
    """Fungsi yang jalan setiap 30 detik buat update session expired"""
    from app.api.v1.endpoints.chat import check_and_update_expired_sessions
    
    async with AsyncSessionLocal() as db:
        await check_and_update_expired_sessions(db)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- STARTUP ---
    # Buat tabel database
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        update_expired_sessions_background,
        trigger=IntervalTrigger(seconds=30),
        id="update_expired_sessions",
        replace_existing=True
    )
    scheduler.start()
    logger.info("SCHEDULER AKTIF! Update expired sessions tiap 30 detik")
    
    yield
    
    # --- SHUTDOWN ---
    scheduler.shutdown()
    logger.info("Scheduler dimatikan")

app = FastAPI(
    title="AKSARA Multi-Tenant Backend API",
    description="Backend REST API untuk Platform AKSARA (Dinas / Tenant Management, Data Warga, Knowledge Base, & Chatbot)",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


# ===== ROOT ENDPOINT =====
@app.get("/", summary="Root Index Endpoint")
async def root():
    return {
        "app": "AKSARA Multi-Tenant Backend API",
        "status": "online",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }


# ===== HEALTH CHECK (UNTUK DOCKER) =====
@app.get("/health", summary="Health Check Endpoint")
async def health_check():
    """Health check endpoint untuk Docker dan monitoring"""
    return {
        "status": "healthy",
        "project": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0"
    }