from fastapi import APIRouter
from app.api.v1.endpoints import auth, tenants, users, warga, knowledge, audit, health, roles, dashboard, chat, storage, usage

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Autentikasi & Authorization"])
api_router.include_router(tenants.router, prefix="/tenants", tags=["Dinas & Tenants"])
api_router.include_router(users.router, prefix="/users", tags=["Manajemen Admin & Users"])
api_router.include_router(warga.router, prefix="/warga", tags=["Data Kependudukan Warga"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["Knowledge Base & Chatbot"])
api_router.include_router(chat.router, prefix="/chat", tags=["Transkrip & Evaluasi Chatbot"])
api_router.include_router(audit.router, prefix="/audit", tags=["Auditing System Log"])
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(roles.router, prefix="/roles", tags=["Role Management"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard Analytics"])
api_router.include_router(storage.router, prefix="", tags=["Storage Management"])
api_router.include_router(usage.router, prefix="/usage", tags=["Usage"])