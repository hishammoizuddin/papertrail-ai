from sqlmodel import Session, select, col, delete, func, or_
from app.models import Document, GraphNode, GraphEdge, User, ActionItem, Deadline
from app.db import get_session
from app.schemas import DossierResponse, DossierStats, DocumentSummary, ActionItemBase
import json
import uuid
from datetime import datetime

def rebuild_graph(session: Session, user: User):
    # 1. Identify existing nodes for this user to clean up
    # We essentially want to clear the slate for this user.
    # CRITICAL FIX: Also find nodes that match the User's Document IDs, even if they don't have user_id set (legacy data).
    
    # Get all user document IDs
    user_doc_ids = session.exec(select(Document.id).where(Document.user_id == user.id)).all()
    
    # Find all nodes that are explicitly owned by user OR correspond to user's documents
    nodes_to_delete_stmt = select(GraphNode.id).where(
        (GraphNode.user_id == user.id) | 
        (GraphNode.id.in_(user_doc_ids))
    )
    nodes_to_delete = session.exec(nodes_to_delete_stmt).all()
    
    print(f"DEBUG: Found {len(nodes_to_delete)} nodes to cleanup (including legacy doc nodes)")
    
    if nodes_to_delete:
        # 2. Delete edges connected to these nodes
        statement = delete(GraphEdge).where(
            (col(GraphEdge.source).in_(nodes_to_delete)) | 
            (col(GraphEdge.target).in_(nodes_to_delete))
        )
        session.exec(statement)
        
        # 3. Delete the nodes
        session.exec(delete(GraphNode).where(col(GraphNode.id).in_(nodes_to_delete)))
        session.commit()

    # 4. Rebuild for this user
    docs = session.exec(select(Document).where(Document.user_id == user.id)).all()
    print(f"DEBUG: Found {len(docs)} documents for user {user.id}")
    
    unique_nodes = {} # id -> GraphNode
    all_edges = []

    for doc in docs:
        print(f"DEBUG: Processing doc {doc.id}, has_extraction={bool(doc.extracted_json)}")
        # Document Node
        # Doc ID is UUID, safe to use directly, but we associate it with user_id
        if doc.id not in unique_nodes:
            # Extract basic properties for the document node
            doc_props = {
                "filename": doc.filename,
                "created_at": doc.created_at.isoformat() if doc.created_at else None
            }
            
            # If extraction exists, add more rich properties to the doc node itself
            if doc.extracted_json:
                try:
                    data = json.loads(doc.extracted_json) if isinstance(doc.extracted_json, str) else doc.extracted_json
                    if data:
                        doc_props.update({
                            "summary": data.get("detailed_summary"),
                            "priority": data.get("priority_score"),
                            "date": data.get("dates")[0]["date"] if data.get("dates") else None,
                            "value": data.get("amounts")[0]["value"] if data.get("amounts") else None,
                            "currency": data.get("amounts")[0]["currency"] if data.get("amounts") else None
                        })
                except Exception as e:
                    print(f"DEBUG: Error processing doc props: {e}")
                    pass

            doc_node = GraphNode(id=doc.id, label=doc.filename, type="document", properties=doc_props, user_id=user.id)
            unique_nodes[doc.id] = doc_node
        
        if not doc.extracted_json:
            continue
            
        try:
            data = json.loads(doc.extracted_json) if isinstance(doc.extracted_json, str) else doc.extracted_json
            if not data: continue

            # Helper to create scoped entity node
            def create_entity_node(entity_type, name, properties=None):
                # SCOPED ID: user_id:type:slug
                slug = name.lower().replace(' ', '_')
                node_id = f"{user.id}:{entity_type}:{slug}"
                if node_id not in unique_nodes:
                    unique_nodes[node_id] = GraphNode(
                        id=node_id, 
                        label=name, 
                        type=entity_type, 
                        properties=properties or {},
                        user_id=user.id
                    )
                return node_id

            # Issuer Node
            if data.get("issuer"):
                issuer_id = create_entity_node("issuer", data["issuer"])
                all_edges.append(GraphEdge(source=doc.id, target=issuer_id, relation="ISSUED_BY"))

            # Category Node
            if data.get("category"):
                cat_id = create_entity_node("category", data["category"])
                all_edges.append(GraphEdge(source=doc.id, target=cat_id, relation="IN_CATEGORY"))

            # Tag Nodes
            for tag in data.get("tags", []):
                tag_id = create_entity_node("tag", tag)
                all_edges.append(GraphEdge(source=doc.id, target=tag_id, relation="TAGGED"))

            # People Nodes
            for person in data.get("people", []):
                person_id = create_entity_node("person", person["name"], {"role": person.get("role")})
                all_edges.append(GraphEdge(source=doc.id, target=person_id, relation="MENTIONS"))

            # Organization Nodes (Entities)
            for org in data.get("organizations", []):
                if data.get("issuer") and org["name"].lower() == data.get("issuer").lower():
                    continue
                org_id = create_entity_node("organization", org["name"], {"type": org.get("type")})
                all_edges.append(GraphEdge(source=doc.id, target=org_id, relation="MENTIONS"))

            # Location Nodes
            for loc in data.get("locations", []):
                loc_id = create_entity_node("location", loc["name"], {"type": loc.get("type")})
                all_edges.append(GraphEdge(source=doc.id, target=loc_id, relation="LOCATED_AT"))
                
        except Exception as e:
            print(f"Error parsing graph data for doc {doc.id}: {e}")

    print(f"DEBUG: Created {len(unique_nodes)} nodes and {len(all_edges)} edges")
    # Bulk insert nodes first
    session.add_all(unique_nodes.values())
    session.flush() # Ensure nodes are committed/flushed before edges (foreign keys)
    
    # Bulk insert edges
    session.add_all(all_edges)
    session.commit()

def get_graph_data(session: Session, user: User):
    nodes = session.exec(select(GraphNode).where(GraphNode.user_id == user.id)).all()
    print(f"DEBUG: get_graph_data found {len(nodes)} nodes for user {user.id}")
    
    # Only fetch edges where both source and target are in the user's nodes (or at least one, depending on strictness)
    # Since we scope all nodes to user_id, generic edges between them belong to user.
    node_ids = {n.id for n in nodes}
    if not node_ids:
        return {"nodes": [], "links": []}

    edges = session.exec(select(GraphEdge).where(
        col(GraphEdge.source).in_(node_ids) & 
        col(GraphEdge.target).in_(node_ids)
    )).all()

    return {"nodes": nodes, "links": edges}

def get_entity_dossier(session: Session, user: User, node_id: str) -> DossierResponse:
    # 1. Fetch the node to get details
    node = session.get(GraphNode, node_id)
    if not node:
        return None  # Or raise HTTPException in router
        
    # Check ownership
    if node.user_id and node.user_id != user.id:
        return None

    # 2. Find all connected Documents
    # We look for edges where this node is Target (e.g. Doc -> ISSUED_BY -> IssuerNode)
    # Or Source (less common for Entity nodes, but possible)
    
    connected_doc_ids = set()
    
    # Case A: Document -> Relation -> Entity Node (Most common)
    incoming_edges = session.exec(select(GraphEdge).where(GraphEdge.target == node_id)).all()
    for edge in incoming_edges:
        # Check if source is a document (UUID format usually, or we can check prefix)
        # Better: check if source exists in Document table
        connected_doc_ids.add(edge.source)

    # Case B: Entity Node -> Relation -> Document (Rare, but maybe "Entity -> OWNS -> Doc")
    outgoing_edges = session.exec(select(GraphEdge).where(GraphEdge.source == node_id)).all()
    for edge in outgoing_edges:
        connected_doc_ids.add(edge.target)
        
    # Query the actual Documents
    if not connected_doc_ids:
        docs = []
    else:
        docs = session.exec(select(Document).where(col(Document.id).in_(connected_doc_ids))).all()
    
    # 3. Aggregate Stats
    total_value = 0.0
    dates = []
    
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
            error_message=doc.error_message
        ))
        
        # Extract value if present
        if doc.extracted_json:
            try:
                data = json.loads(doc.extracted_json) if isinstance(doc.extracted_json, str) else doc.extracted_json
                if data and data.get("amounts"):
                    # Sum up found amounts or just take first? Let's sum for now or take max.
                    # Simplest: Take first amount found
                    val = data.get("amounts")[0].get("value")
                    if val:
                        total_value += float(val)
                
                if data and data.get("dates"):
                    for d_obj in data.get("dates"):
                         if d_obj.get("date"):
                             # Simple string parsing or try/except
                             try:
                                 # Try ISO first, then others if needed. Assuming ISO/Standard from extraction
                                 dt = datetime.fromisoformat(d_obj.get("date"))
                                 dates.append(dt)
                             except:
                                 pass
            except:
                pass
        
        # Also use created_at as fallback date
        dates.append(doc.created_at)

    sorted_dates = sorted(dates)
    first_interaction = sorted_dates[0] if sorted_dates else None
    last_interaction = sorted_dates[-1] if sorted_dates else None
    
    # 4. Find Associated Actions
    # We find actions linked to these documents
    doc_ids_list = [d.id for d in docs]
    actions = []
    if doc_ids_list:
        actions = session.exec(select(ActionItem).where(col(ActionItem.document_id).in_(doc_ids_list))).all()
        # Also could fetch Deadlines
        
    action_summaries = [
        ActionItemBase(
            id=a.id,
            document_id=a.document_id,
            type=a.type,
            description=a.description,
            status=a.status,
            payload=a.payload,
            created_at=a.created_at
        ) for a in actions
    ]

    stats = DossierStats(
        total_documents=len(docs),
        first_interaction=first_interaction,
        last_interaction=last_interaction,
        total_value=round(total_value, 2) if total_value > 0 else None,
        currency="USD" # Default for now
    )

    return DossierResponse(
        node_id=node.id,
        label=node.label,
        type=node.type,
        summary=f"Entity associated with {len(docs)} documents.", # Placeholder for AI summary
        stats=stats,
        related_documents=doc_summaries,
        related_actions=action_summaries
    )
