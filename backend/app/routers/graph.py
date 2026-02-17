from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.db import get_session
from app.services.graph import get_graph_data, rebuild_graph

from app.auth import get_current_user
from app.models import User

router = APIRouter()

@router.get("/data")
def get_graph(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return get_graph_data(session, current_user)

@router.post("/rebuild")
def rebuild_graph_endpoint(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    rebuild_graph(session, current_user)
    return {"status": "success", "message": "Graph rebuilt successfully"}
