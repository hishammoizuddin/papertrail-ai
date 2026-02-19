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

class PatternMatch(BaseModel):
    pattern_id: str
    pattern_name: str
    description: str
    involved_node_ids: List[str]
    confidence: float
    severity: str

class PatternReport(BaseModel):
    matches: List[PatternMatch]

class PatternDefinition(BaseModel):
    id: str
    name: str
    description: str
    severity: str
    prompt_template: str

class DossierStats(BaseModel):
    total_documents: int
    first_interaction: Optional[datetime]
    last_interaction: Optional[datetime]
    total_value: Optional[float] = None
    currency: str = "USD"

class Collaborator(BaseModel):
    id: str
    name: str
    role: Optional[str] = None
    count: int

class TypeDistribution(BaseModel):
    type: str
    count: int

class DossierResponse(BaseModel):
    node_id: str
    label: str
    type: str
    summary: Optional[str] = None
    stats: DossierStats
    related_documents: List[DocumentSummary]
    related_actions: List[ActionItemBase]
    collaborators: List[Collaborator] = []
    distribution: List[TypeDistribution] = []

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

class TimelineEvent(BaseModel):
    id: str
    date: date
    title: str
    description: Optional[str] = None
    type: str # 'document_upload', 'deadline', 'meeting', 'transaction'
    related_node_id: Optional[str] = None

class TimelineResponse(BaseModel):
    events: List[TimelineEvent]
