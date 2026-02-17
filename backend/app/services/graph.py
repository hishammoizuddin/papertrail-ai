from sqlmodel import Session, select, col, delete
from app.models import Document, GraphNode, GraphEdge, User
from app.db import get_session
import json
import uuid

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
