from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from app.db import get_session
from sqlmodel import Session
from app.auth import get_current_user
from app.models import User
from app.services.redaction import redact_entity, export_clean_room

router = APIRouter()

@router.post("/redact/{node_id}")
def redact_node(node_id: str, current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    success = redact_entity(session, current_user, node_id)
    if not success:
        raise HTTPException(status_code=404, detail="Entity not found")
    return {"status": "success", "message": "Entity redacted"}

@router.get("/clean-room")
def get_clean_room_export(current_user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    zip_buffer = export_clean_room(session, current_user)
    return StreamingResponse(
        iter([zip_buffer.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=clean_room_export.zip"}
    )
