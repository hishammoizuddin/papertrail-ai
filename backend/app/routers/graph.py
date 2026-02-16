from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.db import get_session
from app.services.graph import get_graph_data, rebuild_graph

router = APIRouter()

@router.get("/data")
def get_graph(session: Session = Depends(get_session)):
    return get_graph_data(session)

@router.post("/rebuild")
def rebuild_graph_endpoint(session: Session = Depends(get_session)):
    rebuild_graph(session)
    return {"status": "success", "message": "Graph rebuilt successfully"}
