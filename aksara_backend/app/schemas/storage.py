from pydantic import BaseModel

class StorageLimitUpdate(BaseModel):
    max_mb: int

class StorageGlobalConfig(BaseModel):
    default_storage_limit: int = 500
    default_ai_tone: str = "Profesional & Informatif"
    default_temperature: float = 0.5
    default_similarity_threshold: float = 0.7
    default_max_tokens: int = 500