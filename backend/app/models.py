from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel

class Document(SQLModel, table=True):
    id: str = Field(primary_key=True, index=True)
    filename: str
    path: str
    created_at: datetime
    doc_type: Optional[str] = None
    issuer: Optional[str] = None
    primary_due_date: Optional[date] = None
    extracted_json: Optional[str] = None
    status: str
    error_message: Optional[str] = None
    chunks: List["Chunk"] = Relationship(back_populates="document")
    deadlines: List["Deadline"] = Relationship(back_populates="document")

class Chunk(SQLModel, table=True):
    id: str = Field(primary_key=True)
    document_id: str = Field(foreign_key="document.id")
    page: int
    chunk_index: int
    text: str
    created_at: datetime
    document: Optional[Document] = Relationship(back_populates="chunks")

class Deadline(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: str = Field(foreign_key="document.id")
    label: str
    due_date: date
    severity: str
    action: Optional[str] = None
    document: Optional[Document] = Relationship(back_populates="deadlines")

from sqlalchemy import JSON, Column

class GraphNode(SQLModel, table=True):
    id: str = Field(primary_key=True)
    label: str
    type: str  # 'document', 'person', 'issuer', 'organization'
    properties: Optional[dict] = Field(default={}, sa_column=Column(JSON))

class GraphEdge(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    source: str = Field(foreign_key="graphnode.id")
    target: str = Field(foreign_key="graphnode.id")
    relation: str

class ActionItem(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: str = Field(foreign_key="document.id")
    type: str # 'email', 'calendar', 'todo', 'review'
    description: str
    status: str = 'pending' # 'pending', 'completed', 'dismissed'
    payload: Optional[dict] = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    document: Optional[Document] = Relationship()

