from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.db import get_session
from app.services.agents import get_pending_actions, update_action_status, generate_actions_for_document
from app.models import Document
from typing import List
from pydantic import BaseModel

from app.schemas import ActionItemBase

router = APIRouter()

class ActionStatusUpdate(BaseModel):
    status: str

@router.get("/", response_model=List[ActionItemBase]) 
def list_actions(session: Session = Depends(get_session)):
    actions = get_pending_actions(session)
    return actions

@router.post("/{action_id}/status")
def update_status(action_id: int, update: ActionStatusUpdate, session: Session = Depends(get_session)):
    action = update_action_status(session, action_id, update.status)
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    return {"status": "success", "action_status": action.status}

@router.post("/generate/{document_id}")
def trigger_generation(document_id: str, session: Session = Depends(get_session)):
    doc = session.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    generate_actions_for_document(session, doc)
    return {"status": "success", "message": "Actions generated"}
