from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
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
    extracted_json: Optional[Any]
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
    history: Optional[List[Dict[str, str]]] = None

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
    type: str = "action"
    description: str
    status: str
    payload: Optional[dict] = None
    created_at: datetime

class ConflictItem(BaseModel):
    source_id: str
    target_id: str
    description: str
    severity: str

class ConflictReport(BaseModel):
    conflicts: List[ConflictItem]
    node_ids_analyzed: List[str]

class DossierStats(BaseModel):
    total_documents: int
    first_interaction: Optional[datetime]
    last_interaction: Optional[datetime]
    total_value: Optional[float] = None
    currency: str = "USD"

class DossierResponse(BaseModel):
    node_id: str
    label: str
    type: str
    summary: Optional[str] = None
    stats: DossierStats
    related_documents: List[DocumentSummary]
    related_actions: List[ActionItemBase]

class ArenaPersona(BaseModel):
    name: str
    role: str

class ArenaStartRequest(BaseModel):
    topic: str
    document_ids: List[str]
    persona_a: ArenaPersona
    persona_b: ArenaPersona

class ArenaTurnRequest(BaseModel):
    history: List[Dict[str, str]]
    current_speaker: ArenaPersona
    context: str

class ArenaResponse(BaseModel):
    speaker: str
    message: str
