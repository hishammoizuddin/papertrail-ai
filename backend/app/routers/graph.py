from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session
from app.db import get_session
from app.services.graph import get_graph_data, rebuild_graph, get_entity_dossier

from app.auth import get_current_user
from app.models import User
from app.schemas import DossierResponse

router = APIRouter()

@router.get("/data")
def get_graph(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return get_graph_data(session, current_user)

@router.get("/dossier/{node_id}", response_model=DossierResponse)
def get_dossier_endpoint(node_id: str, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    dossier = get_entity_dossier(session, current_user, node_id)
    if not dossier:
        raise HTTPException(status_code=404, detail="Entity not found or access denied")
    return dossier

@router.post("/rebuild")
def rebuild_graph_endpoint(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rebuild_graph(session, current_user)
    return {"status": "success", "message": "Graph rebuilt successfully"}

from app.schemas import PatternReport
from typing import List

class PatternRequest(BaseModel):
    pattern_id: str = None  # Optional: Run specific pattern only

@router.post("/patterns/detect", response_model=PatternReport)
def detect_patterns_endpoint(req: PatternRequest, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    from app.services.pattern_recognition import detect_patterns
    return detect_patterns(session, current_user, req.pattern_id)
