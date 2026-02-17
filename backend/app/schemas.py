from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime, date

class DocumentBase(BaseModel):
    id: str
    filename: str
    path: str
    created_at: datetime
    doc_type: Optional[str]
    issuer: Optional[str]
    primary_due_date: Optional[date]
    extracted_json: Optional[Any]
    status: str
    error_message: Optional[str]

class DocumentSummary(BaseModel):
    id: str
    filename: str
    path: str
    created_at: datetime
    doc_type: Optional[str]
    issuer: Optional[str]
    primary_due_date: Optional[date]
    status: str
    error_message: Optional[str]

class ChunkBase(BaseModel):
    id: str
    document_id: str
    page: int
    chunk_index: int
    text: str
    created_at: datetime

class DeadlineBase(BaseModel):
    id: int
    document_id: str
    label: str
    due_date: date
    severity: str
    action: Optional[str]

class ChatRequest(BaseModel):
    message: str
    top_k: Optional[int] = 10
    document_id: Optional[str] = None
    image_url: Optional[str] = None

class ChatCitation(BaseModel):
    document_id: str
    filename: str
    page: int
    chunk_id: str

class ChatResponse(BaseModel):
    answer: str
    citations: List[ChatCitation]

class ActionItemBase(BaseModel):
    id: int
    document_id: str
    type: str
    description: str
    status: str
    payload: Optional[dict] = None
    created_at: datetime
