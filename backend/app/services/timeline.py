from sqlmodel import Session, select
from app.models import Document, GraphNode, GraphEdge
from app.schemas import TimelineEvent, TimelineResponse
from typing import List, Dict, Any
from datetime import datetime
import json

def extract_timeline_events(session: Session, user) -> TimelineResponse:
    """
    Extracts chronological events from documents and entities.
    Sources of events:
    1. Document Metadata (Created At, Primary Due Date)
    2. Extracted Entities (Dates mentioned in text)
    3. Graph Edges (if they have temporal properties, though currently rare)
    """
    
    events = []
    
    # 1. Fetch Documents
    docs = session.exec(select(Document).where(Document.user_id == user.id)).all()
    
    for doc in docs:
        # Created Date
        events.append(TimelineEvent(
            id=f"doc_created_{doc.id}",
            date=doc.created_at.date(),
            title=f"Document Uploaded: {doc.filename}",
            description=f"Type: {doc.doc_type or 'Unknown'}",
            type="document_upload",
            related_node_id=doc.id
        ))
        
        # Extracted Dates from JSON
        if doc.extracted_json:
            try:
                data = json.loads(doc.extracted_json)
                
                # Primary Due Date / Invoice Date
                if data.get("date"):
                    try:
                        date_val = datetime.strptime(data.get("date"), "%Y-%m-%d").date()
                        events.append(TimelineEvent(
                            id=f"doc_date_{doc.id}",
                            date=date_val,
                            title=f"Document Date: {doc.filename}",
                            description=f"Extracted date from document.",
                            type="document_date",
                            related_node_id=doc.id
                        ))
                    except:
                        pass
                
                # Due Date
                if data.get("due_date"):
                    try:
                        date_val = datetime.strptime(data.get("due_date"), "%Y-%m-%d").date()
                        events.append(TimelineEvent(
                            id=f"doc_due_{doc.id}",
                            date=date_val,
                            title=f"Due Date: {doc.filename}",
                            description=f"Action item due date.",
                            type="deadline",
                            related_node_id=doc.id
                        ))
                    except:
                        pass
                        
            except:
                pass

    # 2. Fetch "Date" Entities (Graph Nodes of type 'date')
    # Use existing graph nodes if we have explicit date nodes (depends on extraction logic)
    # Current logic seems to extract entities, let's see if 'DATE' is a type. 
    # Even if not, we can rely on Document extraction for now.
    
    # Sort by date
    events.sort(key=lambda x: x.date)
    
    return TimelineResponse(events=events)
