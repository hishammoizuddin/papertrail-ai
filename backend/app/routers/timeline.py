from fastapi import APIRouter
from app.models import Deadline, Document
from app.db import get_session
from sqlmodel import select
from typing import List
from datetime import date

router = APIRouter()

@router.get("/", response_model=List[dict])
def get_timeline():
	with get_session() as session:
		today = date.today()
		q = select(Deadline, Document).join(Document, Deadline.document_id == Document.id).where(Deadline.due_date >= today).order_by(Deadline.due_date)
		results = session.exec(q).all()
		timeline = []
		for d, doc in results:
			timeline.append({
				"id": d.id,
				"document_id": d.document_id,
				"label": d.label,
				"due_date": d.due_date,
				"severity": d.severity,
				"action": d.action,
				"filename": doc.filename,
				"doc_type": doc.doc_type
			})
		return timeline
