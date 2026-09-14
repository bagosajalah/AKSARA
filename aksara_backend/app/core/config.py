from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "AKSARA Multi-Tenant Backend API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = "aksara-super-secret-jwt-key-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    DATABASE_URL: str = "postgresql+asyncpg://postgres:Bagus3663@database:5432/db_aksara"
    
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://frontend:5173",
    ]

    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: str = ""

    CHROMA_HOST: str = "chromadb"
    CHROMA_PORT: int = 8000

    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""

    DEFAULT_LLM_PROVIDER: Optional[str] = None
    DEFAULT_LLM_MODEL: Optional[str] = None

    ENCRYPTION_KEY: str = "rahasiaaksarakita2026rahasia"

    CACHE_TTL: int = 3600
    MAX_MEMORY_CACHE: int = 1000

    LOG_LEVEL: str = "INFO"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8", 
        extra="ignore"
    )

settings = Settings()