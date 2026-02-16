from sqlmodel import Session, select
from app.models import Document, ActionItem
from app.db import get_session
import json
from datetime import datetime

def generate_actions_for_document(session: Session, doc: Document):
    if not doc.extracted_json:
        return

    try:
        data = json.loads(doc.extracted_json) if isinstance(doc.extracted_json, str) else doc.extracted_json
        
        # 1. Deadline Actions -> Calendar / Todo
        for deadline in data.get("deadlines", []):
            action = ActionItem(
                document_id=doc.id,
                type="calendar" if deadline.get("due_date") else "todo",
                description=f"Deadline: {deadline.get('action')} by {deadline.get('due_date')}",
                payload={
                    "title": deadline.get("action"),
                    "date": deadline.get("due_date"),
                    "severity": deadline.get("severity")
                }
            )
            session.add(action)

        # 2. Recommended Actions -> Todo
        for rec in data.get("recommended_actions", []):
             action = ActionItem(
                document_id=doc.id,
                type="todo",
                description=f"Recommendation: {rec}",
                payload={"text": rec}
            )
             session.add(action)

        # 3. Issuer specific actions (Example logic)
        if data.get("issuer") and "Invoice" in (doc.doc_type or ""):
             action = ActionItem(
                document_id=doc.id,
                type="email",
                description=f"Draft email to {data.get('issuer')} regarding Invoice",
                payload={
                    "recipient": "billing@example.com", # Placeholder
                    "subject": f"Question regarding Invoice from {data.get('issuer')}",
                    "body_template": "Hi,\n\nI have a question regarding the invoice..."
                }
            )
             session.add(action)

        session.commit()
    except Exception as e:
        print(f"Error generating actions for doc {doc.id}: {e}")

def get_pending_actions(session: Session):
    return session.exec(select(ActionItem).where(ActionItem.status == 'pending').order_by(ActionItem.created_at.desc())).all()

def execute_action(session: Session, action_id: int):
    # In a real agentic system, this would call an external tool/LLM
    # For this demo, we mark it as completed or return a payload to frontend
    action = session.get(ActionItem, action_id)
    if action:
        # Simulate execution logic here if needed
        return action
    return None

def update_action_status(session: Session, action_id: int, status: str):
    action = session.get(ActionItem, action_id)
    if action:
        action.status = status
        session.add(action)
        session.commit()
    return action
