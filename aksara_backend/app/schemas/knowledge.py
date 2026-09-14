from uuid import UUID
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class KnowledgeBaseBase(BaseModel):
    judul: str
    kategori: str
    konten: str
    status: Optional[str] = "published"

class KnowledgeBaseCreate(KnowledgeBaseBase):
    tenant_id: UUID
    file_size: Optional[int] = 0
    file_type: Optional[str] = "TXT"

class KnowledgeBaseUpdate(BaseModel):
    judul: Optional[str] = None
    kategori: Optional[str] = None
    konten: Optional[str] = None
    status: Optional[str] = None
    file_size: Optional[int] = None
    file_type: Optional[str] = None

class KnowledgeBaseResponse(KnowledgeBaseBase):
    id: UUID
    tenant_id: UUID
    created_at: datetime
    updated_at: datetime
    file_size: int
    file_type: Optional[str]
    model_config = ConfigDict(from_attributes=True)

class ChatbotInteractionCreate(BaseModel):
    tenant_id: UUID
    session_id: str
    user_query: str
    bot_response: str
    sentiment: Optional[str] = None

class ChatbotInteractionResponse(ChatbotInteractionCreate):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)