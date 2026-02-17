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
                user_id=doc.user_id,
                type="calendar" if deadline.get("due_date") else "todo",
                description=f"Deadline: {deadline.get('action')} by {deadline.get('due_date')}",
                payload={
                    "title": deadline.get("action"),
                    "date": deadline.get("due_date"),
                    "severity": deadline.get("severity"),
                    "priority": data.get("priority_score"),
                    "tags": data.get("tags", [])
                }
            )
            session.add(action)

        # 2. Recommended Actions -> Todo
        for rec in data.get("recommended_actions", []):
            action = ActionItem(
                document_id=doc.id,
                user_id=doc.user_id,
                type="todo",
                description=rec, # Use the raw recommendation as description
                payload={
                     "text": rec,
                     "priority": data.get("priority_score"),
                     "tags": data.get("tags", [])
                }
            )
            session.add(action)

        # 3. Expiry / Renewal Dates -> Calendar / Todo
        for date_item in data.get("dates", []):
            label = date_item.get("label", "").lower()
            date_val = date_item.get("date")
            if not date_val:
                continue

            # Keywords indicating expiration or renewal
            if any(kw in label for kw in ["expir", "renew", "valid until", "due", "end"]):
                 # Check if we already have a deadline/action for this specific date/label to avoid dupes?
                 # ideally implemented with a unique constraint or check, but for now simple insert
                 
                 # Calculate severity (simple check)
                 try:
                    d = datetime.strptime(date_val, "%Y-%m-%d").date()
                    days_left = (d - datetime.utcnow().date()).days
                    severity = "high" if days_left < 30 else "medium" if days_left < 90 else "low"
                    
                    if days_left < 0:
                        desc = f"EXPIRED: {date_item.get('label')} on {date_val}"
                        severity = "high"
                    else:
                        desc = f"Renew/Action: {date_item.get('label')} by {date_val}"
                 except:
                    severity = "medium"
                    desc = f"Action: {date_item.get('label')} by {date_val}"

                 action = ActionItem(
                    document_id=doc.id,
                    user_id=doc.user_id,
                    type="calendar",
                    description=desc,
                    payload={
                        "title": f"Renew {doc.doc_type or 'Document'}",
                        "date": date_val,
                        "severity": severity,
                        "label": date_item.get("label"),
                        "priority": data.get("priority_score"),
                        "tags": data.get("tags", [])
                    }
                )
                 session.add(action)

        # 4. Issuer specific actions (Example logic)
        if data.get("issuer") and "Invoice" in (doc.doc_type or ""):
             action = ActionItem(
                document_id=doc.id,
                user_id=doc.user_id,
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
        # Simulate execution
        # For 'calendar', we might actually call Google Calendar API here
        # For 'email', we might call Gmail API
        
        # For now, we just return the action so frontend can open the link/modal
        return action
    return None

def update_action_status(session: Session, action_id: int, status: str):
    action = session.get(ActionItem, action_id)
    if action:
        action.status = status
        session.add(action)
        session.commit()
    return action
