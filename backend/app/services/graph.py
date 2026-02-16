from sqlmodel import Session, select
from app.models import Document, GraphNode, GraphEdge
from app.db import get_session
import json
import uuid

def rebuild_graph(session: Session):
    # Clear existing graph
    session.exec(select(GraphEdge)).all() # Executing just in case
    session.query(GraphEdge).delete()
    session.query(GraphNode).delete()
    session.commit()

    docs = session.exec(select(Document)).all()
    
    unique_nodes = {} # id -> GraphNode

    for doc in docs:
        # Document Node
        if doc.id not in unique_nodes:
            doc_node = GraphNode(id=doc.id, label=doc.filename, type="document")
            unique_nodes[doc.id] = doc_node
            session.add(doc_node)
        
        if not doc.extracted_json:
            continue
            
        try:
            data = json.loads(doc.extracted_json) if isinstance(doc.extracted_json, str) else doc.extracted_json
            if not data: continue

            # Issuer Node
            if data.get("issuer"):
                issuer_name = data["issuer"]
                issuer_id = f"issuer:{issuer_name.lower().replace(' ', '_')}"
                if issuer_id not in unique_nodes:
                    node = GraphNode(id=issuer_id, label=issuer_name, type="issuer")
                    unique_nodes[issuer_id] = node
                    session.add(node)
                
                # Edge: Document -> ISSUED_BY -> Issuer
                edge = GraphEdge(source=doc.id, target=issuer_id, relation="ISSUED_BY")
                session.add(edge)

            # People Nodes
            for person in data.get("people", []):
                person_name = person["name"]
                person_id = f"person:{person_name.lower().replace(' ', '_')}"
                if person_id not in unique_nodes:
                    node = GraphNode(id=person_id, label=person_name, type="person")
                    unique_nodes[person_id] = node
                    session.add(node)
                
                # Edge: Document -> MENTIONS -> Person
                edge = GraphEdge(source=doc.id, target=person_id, relation="MENTIONS")
                session.add(edge)
                
        except Exception as e:
            print(f"Error parsing graph data for doc {doc.id}: {e}")

    session.commit()

def get_graph_data(session: Session):
    nodes = session.exec(select(GraphNode)).all()
    edges = session.exec(select(GraphEdge)).all()
    return {"nodes": nodes, "links": edges}
