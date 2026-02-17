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
                except:
                    pass

            doc_node = GraphNode(id=doc.id, label=doc.filename, type="document", properties=doc_props)
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

            # Category Node
            if data.get("category"):
                cat_name = data["category"]
                cat_id = f"category:{cat_name.lower().replace(' ', '_')}"
                if cat_id not in unique_nodes:
                    node = GraphNode(id=cat_id, label=cat_name, type="category")
                    unique_nodes[cat_id] = node
                    session.add(node)
                
                # Edge: Document -> IN_CATEGORY -> Category
                edge = GraphEdge(source=doc.id, target=cat_id, relation="IN_CATEGORY")
                session.add(edge)

            # Tag Nodes
            for tag in data.get("tags", []):
                tag_id = f"tag:{tag.lower().replace(' ', '_')}"
                if tag_id not in unique_nodes:
                    node = GraphNode(id=tag_id, label=tag, type="tag")
                    unique_nodes[tag_id] = node
                    session.add(node)
                
                # Edge: Document -> TAGGED -> Tag
                edge = GraphEdge(source=doc.id, target=tag_id, relation="TAGGED")
                session.add(edge)

            # People Nodes
            for person in data.get("people", []):
                person_name = person["name"]
                person_id = f"person:{person_name.lower().replace(' ', '_')}"
                if person_id not in unique_nodes:
                    node = GraphNode(id=person_id, label=person_name, type="person", properties={"role": person.get("role")})
                    unique_nodes[person_id] = node
                    session.add(node)
                
                # Edge: Document -> MENTIONS -> Person
                edge = GraphEdge(source=doc.id, target=person_id, relation="MENTIONS")
                session.add(edge)

            # Organization Nodes (Entities)
            for org in data.get("organizations", []):
                org_name = org["name"]
                # Avoid duping issuer if it's the same
                if data.get("issuer") and org_name.lower() == data.get("issuer").lower():
                    continue

                org_id = f"org:{org_name.lower().replace(' ', '_')}"
                if org_id not in unique_nodes:
                    node = GraphNode(id=org_id, label=org_name, type="organization", properties={"type": org.get("type")})
                    unique_nodes[org_id] = node
                    session.add(node)
                
                # Edge: Document -> MENTIONS -> Organization
                edge = GraphEdge(source=doc.id, target=org_id, relation="MENTIONS")
                session.add(edge)

            # Location Nodes
            for loc in data.get("locations", []):
                loc_name = loc["name"]
                loc_id = f"loc:{loc_name.lower().replace(' ', '_')}"
                if loc_id not in unique_nodes:
                    node = GraphNode(id=loc_id, label=loc_name, type="location", properties={"type": loc.get("type")})
                    unique_nodes[loc_id] = node
                    session.add(node)
                
                # Edge: Document -> LOCATED_AT -> Location
                edge = GraphEdge(source=doc.id, target=loc_id, relation="LOCATED_AT")
                session.add(edge)
                
        except Exception as e:
            print(f"Error parsing graph data for doc {doc.id}: {e}")

    session.commit()

def get_graph_data(session: Session):
    nodes = session.exec(select(GraphNode)).all()
    edges = session.exec(select(GraphEdge)).all()
    return {"nodes": nodes, "links": edges}
