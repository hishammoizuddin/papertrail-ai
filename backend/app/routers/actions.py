from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from app.db import get_session
from app.services.agents import get_pending_actions, update_action_status, generate_actions_for_document
from app.models import Document, User, ActionItem
from app.auth import get_current_user
from sqlmodel import select
from typing import List
from pydantic import BaseModel

from app.schemas import ActionItemBase

router = APIRouter()

class ActionStatusUpdate(BaseModel):
    status: str

@router.get("/", response_model=List[ActionItemBase]) 
def list_actions(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    # We need to filter by user_id. The get_pending_actions service likely needs update or we filter here manually if service is generic.
    # Let's inspect get_pending_actions service or just do a direct query here for now to be safe.
    actions = session.exec(select(ActionItem).where(ActionItem.user_id == current_user.id, ActionItem.status == 'pending')).all()
    return actions

@router.post("/{action_id}/status")
def update_status(action_id: int, update: ActionStatusUpdate, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    # Verify ownership
    action = session.get(ActionItem, action_id)
    if not action or action.user_id != current_user.id:
         raise HTTPException(status_code=404, detail="Action not found")
    
    action.status = update.status
    session.add(action)
    session.commit()
    session.refresh(action)
    return {"status": "success", "action_status": action.status}

@router.post("/dismiss-all")
def dismiss_all_actions(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """
    Dismiss all pending actions for the current user.
    """
    statement = select(ActionItem).where(ActionItem.user_id == current_user.id, ActionItem.status == 'pending')
    actions = session.exec(statement).all()
    
    for action in actions:
        action.status = 'dismissed'
        session.add(action)
    
    session.commit()
    
    return {"status": "success", "count": len(actions)}

@router.post("/generate/{document_id}")
def trigger_generation(document_id: str, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    doc = session.get(Document, document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    generate_actions_for_document(session, doc)
    return {"status": "success", "message": "Actions generated"}
