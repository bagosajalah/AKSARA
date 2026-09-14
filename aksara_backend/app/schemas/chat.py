from uuid import UUID
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ChatMessageCreate(BaseModel):
    sender: str
    text: str
    time_str: Optional[str] = None
    is_jailbreak: Optional[bool] = False

class ChatMessageResponse(BaseModel):
    id: UUID
    session_id: UUID
    sender: str
    text: str
    time_str: Optional[str] = None
    is_jailbreak: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatSessionCreate(BaseModel):
    session_code: str
    tenant_id: UUID
    user_name: Optional[str] = "Warga Anonim"
    facility_name: Optional[str] = None
    duration: Optional[str] = "0m 0s"
    topic: Optional[str] = "Umum"
    status: Optional[str] = "Selesai"
    jailbreak: Optional[bool] = False
    messages: Optional[List[ChatMessageCreate]] = []

class ChatSessionResponse(BaseModel):
    id: UUID
    session_code: str
    tenant_id: UUID
    user_name: str
    facility_name: Optional[str] = None
    duration: Optional[str] = "0m 0s"
    topic: Optional[str] = "Umum"
    status: str
    jailbreak: bool
    created_at: datetime
    messages: Optional[List[ChatMessageResponse]] = []

    model_config = ConfigDict(from_attributes=True)


class ChatReviewCreate(BaseModel):
    review_code: Optional[str] = None
    session_id: Optional[UUID] = None
    tenant_id: UUID
    user_name: Optional[str] = "Warga Anonim"
    facility_name: Optional[str] = None
    is_positive: bool = True
    text: str

class ChatReviewResponse(BaseModel):
    id: UUID
    review_code: Optional[str] = None
    session_id: Optional[UUID] = None
    tenant_id: UUID
    user_name: str
    facility_name: Optional[str] = None
    is_positive: bool
    text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TrendingTopicResponse(BaseModel):
    topic: str
    count: int
    rating: int


class ChatPublicQueryRequest(BaseModel):
    tenant_code: Optional[str] = "dinkes"
    user_name: Optional[str] = "Warga Anonim"
    message: str
    session_code: Optional[str] = None

class ChatPublicQueryResponse(BaseModel):
    session_code: str
    answer: str
    topic: str
    matched_article: Optional[str] = None
    similarity_score: Optional[float] = None
