
from pydantic import BaseModel
from typing import List, Optional

class ArenaPersona(BaseModel):
    name: str
    role: str

class ArenaStartRequest(BaseModel):
    topic: str
    document_ids: List[str]
    persona_a: ArenaPersona
    persona_b: ArenaPersona

class ArenaTurnRequest(BaseModel):
    history: List[dict] # List of {role: "Persona A", content: "..."}
    current_speaker: ArenaPersona
    context: str

class ArenaResponse(BaseModel):
    speaker: str
    message: str
