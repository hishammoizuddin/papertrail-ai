from fastapi import APIRouter, Depends
from app.db import get_session
from sqlmodel import Session
from app.auth import get_current_user
from app.models import User
from app.schemas import TimelineResponse
from app.services.timeline import extract_timeline_events

router = APIRouter()

@router.get("/", response_model=TimelineResponse)
def get_timeline(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    return extract_timeline_events(session, current_user)
