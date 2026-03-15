"""
graph.py router — now backed by Neo4j via neo4j_service.

The /data and /rebuild endpoints call neo4j_service directly.
The /dossier endpoint builds a full DossierResponse from Neo4j traversal data
augmented with SQL for document details (amounts, dates, actions, deadlines).
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select, col
from app.db import get_session
from app.auth import get_current_user
from app.models import User, Document, ActionItem
from app.schemas import (
    DossierResponse, DossierStats, DocumentSummary,
    ActionItemBase, TypeDistribution, Collaborator, PatternReport
)
from app.services import neo4j_service
from collections import defaultdict
from datetime import datetime
from typing import List
import json

router = APIRouter()


@router.get("/data")
def get_graph(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Return the full knowledge graph for the current user (Neo4j-backed)."""
    return neo4j_service.get_graph_data(current_user.id)


@router.post("/rebuild")
def rebuild_graph_endpoint(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Wipe and fully rebuild the user's Neo4j graph from stored extractions."""
    docs = session.exec(select(Document).where(Document.user_id == current_user.id)).all()
    neo4j_service.rebuild_graph_for_user(current_user.id, docs)
    return {"status": "success", "message": f"Graph rebuilt with {len(docs)} documents"}


@router.get("/dossier/{node_id}", response_model=DossierResponse)
def get_dossier_endpoint(
    node_id: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """
    Build an entity dossier.
    Graph traversal comes from Neo4j; document details are fetched from MySQL.
    """
    neo4j_data = neo4j_service.get_entity_dossier(node_id, current_user.id)
    if not neo4j_data:
        raise HTTPException(status_code=404, detail="Entity not found or access denied")

    connected_doc_ids = neo4j_data.get("connected_doc_ids", [])

    # --- Enrich from SQL ---
    docs = []
    if connected_doc_ids:
        docs = session.exec(
            select(Document).where(col(Document.id).in_(connected_doc_ids))
        ).all()

    total_value = 0.0
    dates = []
    type_counts = defaultdict(int)
    doc_summaries = []

    for doc in docs:
        doc_summaries.append(DocumentSummary(
            id=doc.id,
            filename=doc.filename,
            path=doc.path,
            created_at=doc.created_at,
            doc_type=doc.doc_type,
            issuer=doc.issuer,
            primary_due_date=doc.primary_due_date,
            extracted_json=doc.extracted_json,
            status=doc.status,
            error_message=doc.error_message,
        ))

        if doc.extracted_json:
            try:
                data = json.loads(doc.extracted_json) if isinstance(doc.extracted_json, str) else doc.extracted_json
                if data and data.get("amounts"):
                    val = data["amounts"][0].get("value")
                    if val:
                        total_value += float(val)
                if data and data.get("dates"):
                    for d_obj in data["dates"]:
                        if d_obj.get("date"):
                            try:
                                dates.append(datetime.fromisoformat(d_obj["date"]))
                            except Exception:
                                pass
            except Exception:
                pass

        if doc.created_at:
            dates.append(doc.created_at)
        type_counts[doc.doc_type or "Uncategorized"] += 1

    sorted_dates = sorted(dates)
    stats = DossierStats(
        total_documents=len(docs),
        first_interaction=sorted_dates[0] if sorted_dates else None,
        last_interaction=sorted_dates[-1] if sorted_dates else None,
        total_value=round(total_value, 2) if total_value > 0 else None,
        currency="USD",
    )

    distribution = [
        TypeDistribution(type=k, count=v)
        for k, v in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)
    ]

    # Actions from SQL
    actions = []
    if connected_doc_ids:
        actions = session.exec(
            select(ActionItem).where(col(ActionItem.document_id).in_(connected_doc_ids))
        ).all()

    action_summaries = [
        ActionItemBase(
            id=a.id,
            document_id=a.document_id,
            type=a.type,
            description=a.description,
            status=a.status,
            payload=a.payload,
            created_at=a.created_at,
        ) for a in actions
    ]

    collaborators = [
        Collaborator(
            id=c["id"],
            name=c["name"],
            role=c["role"],
            count=c["count"],
        ) for c in neo4j_data.get("collaborators", [])
    ]

    return DossierResponse(
        node_id=neo4j_data["node_id"],
        label=neo4j_data["label"],
        type=neo4j_data["type"],
        summary=f"Entity associated with {len(docs)} documents.",
        stats=stats,
        related_documents=doc_summaries,
        related_actions=action_summaries,
        collaborators=collaborators,
        distribution=distribution,
    )


# --- Pattern Detection (unchanged — still uses SQL-based pattern_recognition) ---
class PatternRequest(BaseModel):
    pattern_id: str = None


@router.post("/patterns/detect", response_model=PatternReport)
def detect_patterns_endpoint(
    req: PatternRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    from app.services.pattern_recognition import detect_patterns
    return detect_patterns(session, current_user, req.pattern_id)
