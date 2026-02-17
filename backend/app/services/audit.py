from sqlmodel import Session, select
from app.models import Document, GraphNode, GraphEdge
from app.schemas import ConflictReport, ConflictItem
from typing import List, Dict, Any
import openai
from app.config import OPENAI_API_KEY
import json

openai.api_key = OPENAI_API_KEY

def analyze_conflicts(session: Session, user, node_ids: List[str] = None) -> ConflictReport:
    """
    Analyzes the selected nodes (and their immediate neighbors) for conflicting information.
    If no nodes are selected, it analyzes the entire graph (careful with costs!).
    """
    
    # 1. Fetch relevant nodes
    if node_ids:
        # Fetch selected nodes
        nodes = session.exec(select(GraphNode).where(GraphNode.id.in_(node_ids), GraphNode.user_id == user.id)).all()
        
        # Also fetch neighbors of selected nodes to find conflicts *between* them
        neighbor_ids = set()
        for nid in node_ids:
            edges = session.exec(select(GraphEdge).where(
                (GraphEdge.source == nid) | (GraphEdge.target == nid)
            )).all()
            for e in edges:
                neighbor_ids.add(e.source)
                neighbor_ids.add(e.target)
        
        # Remove original nodes from neighbor set to avoid duplicates
        for nid in node_ids:
            if nid in neighbor_ids:
                neighbor_ids.remove(nid)
        
        neighbors = session.exec(select(GraphNode).where(GraphNode.id.in_(neighbor_ids), GraphNode.user_id == user.id)).all()
        all_nodes = nodes + neighbors
    else:
        # Default: Analyze entire graph for user (Limit to 50 nodes for safety/cost)
        all_nodes = session.exec(select(GraphNode).where(GraphNode.user_id == user.id).limit(50)).all()

    if len(all_nodes) < 2:
        return ConflictReport(conflicts=[], node_ids_analyzed=[n.id for n in all_nodes])

    # 2. Prepare context for LLM
    # We need to fetch the underlying document content or metadata for these nodes.
    # GraphNode has 'label' and 'type', but we might need more details from Document.extracted_json if available.
    
    node_context = []
    
    # Pre-fetch documents for these nodes if they are documents
    doc_ids = [n.id for n in all_nodes if n.type == 'document'] # Assuming graph node ID matches doc ID for doc nodes
    docs = session.exec(select(Document).where(Document.id.in_(doc_ids))).all()
    doc_map = {d.id: d for d in docs}
    
    for node in all_nodes:
        info = {
            "id": node.id,
            "label": node.label,
            "type": node.type
        }
        
        # If it's a document node, enrich with extracted data (dates, amounts)
        if node.id in doc_map:
            doc = doc_map[node.id]
            if doc.extracted_json:
                try:
                    data = json.loads(doc.extracted_json)
                    # Flatten relevant fields for comparison
                    info["extracted_data"] = {
                        "date": data.get("date"),
                        "total_amount": data.get("total_amount"),
                        "due_date": data.get("due_date"),
                        "invoice_number": data.get("invoice_number"),
                        "contract_id": data.get("contract_id"),
                        "deadlines": data.get("deadlines")
                    }
                except:
                    pass
        
        node_context.append(info)

    user_prompt = f"""
    Analyze the following graph nodes (representing documents and entities) for potential conflicts or inconsistencies.
    
    Focus on:
    1. Dates: Check for impossible timelines (e.g., Invoice date before Contract start date, Due date before issue date).
    2. Amounts: Check if Invoice totals match related POs or Quote amounts.
    3. Terms: Check if payment terms (Net 30 vs Immediate) match between Contracts and Invoices.
    
    Nodes:
    {json.dumps(node_context, indent=2, default=str)}
    
    Return a JSON object with a list of conflicts. Each conflict should have:
    - source_id: ID of the first node
    - target_id: ID of the second node
    - description: A brief explanation of the conflict (max 1 sentence)
    - severity: "high", "medium", or "low"
    
    If no conflicts are found, return empty list.
    Response Format: {{"conflicts": [...]}}
    """

    try:
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert auditor AI. Find logical inconsistencies in financial and legal documents."},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        conflicts = [ConflictItem(**c) for c in result.get("conflicts", [])]
        
        # Verify that the returned IDs actually exist in our set (LLM hallucination check)
        valid_ids = set([n.id for n in all_nodes])
        valid_conflicts = []
        for c in conflicts:
            if c.source_id in valid_ids and c.target_id in valid_ids:
                valid_conflicts.append(c)
        
        return ConflictReport(conflicts=valid_conflicts, node_ids_analyzed=[n.id for n in all_nodes])

    except Exception as e:
        print(f"Error in conflict analysis: {e}")
        return ConflictReport(conflicts=[], node_ids_analyzed=[])
