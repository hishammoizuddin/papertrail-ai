from sqlmodel import Session, select, col, delete, func, or_
from app.models import Document, GraphNode, GraphEdge, User, ActionItem, Deadline
from app.db import get_session
from app.schemas import DossierResponse, DossierStats, DocumentSummary, ActionItemBase, TrendPoint, TypeDistribution, Collaborator
import json
import uuid
import re
from datetime import datetime

# --- HEURISTIC HELPERS ---
NON_PERSON_KEYWORDS = {
    "accounts payable", "payable", "receivable", "billing", "department", "dept", 
    "manager", "director", "officer", "support", "help", "desk", "service", "customer", 
    "team", "group", "committee", "board", "council", "agency", "irs", "tax", 
    "government", "city", "state", "county", "unknown", "n/a", "none"
}

def normalize_entity_name(name: str) -> str:
    """
    Normalizes an entity name to improve merging.
    1. Lowercase
    2. Remove punctuation (keep alphanumeric and spaces)
    3. Strip common corporate suffixes
    
    Example: "TechCorp, Inc." -> "techcorp"
    """
    if not name: return ""
    
    # Lowercase and strip
    n = name.lower().strip()
    
    # Remove punctuation using regex (keep letters, numbers, spaces)
    n = re.sub(r'[^\w\s]', '', n)
    
    # Common corporate suffixes to strip (must be at end of string)
    suffixes = [
        " inc", " incorporated", " corp", " corporation", " llc", " ltd", " limited",
        " co", " company", " gmbh", " sarl", " sa", " plc"
    ]
    suffixes.sort(key=len, reverse=True)
    
    for suffix in suffixes:
        if n.endswith(suffix):
            n = n[:-len(suffix)].strip()
            break
            
    return n


def is_likely_person(name):
    if not name: return False
    n = name.lower().strip()
    if n in NON_PERSON_KEYWORDS: return False
    
    # Check if any constituent word is a non-person keyword
    # e.g. "Customer Service" -> "customer" and "service" are keywords
    parts = n.split()
    for part in parts:
        if part in NON_PERSON_KEYWORDS:
            return False
            
    # Check for "The [Role]" pattern
    if n.startswith("the "): return False
    
    return True

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

   # Helper to create scoped entity node
    def get_or_create_node(entity_type, name, properties=None):
        if not name: return None
        # SCOPED ID: user_id:type:normalized_slug
        
        # New Resolution Logic:
        normalized_name = normalize_entity_name(name)
        if not normalized_name: return None # Should not happen if name exists
        
        # Create slug from normalized name (remove spaces for ID)
        slug = normalized_name.replace(' ', '')
        
        node_id = f"{user.id}:{entity_type}:{slug}"
        
        if node_id not in unique_nodes:
            unique_nodes[node_id] = GraphNode(
                id=node_id, 
                label=name.strip(), 
                type=entity_type, 
                properties=properties or {},
                user_id=user.id
            )
        return node_id

    for doc in docs:
        print(f"DEBUG: Processing doc {doc.id}, has_extraction={bool(doc.extracted_json)}")
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

            # --- NEW LOGIC: Explicit Relationships (Knowledge Graph 2.0) ---
            if data.get("relationships") and isinstance(data["relationships"], list) and len(data["relationships"]) > 0:
                print(f"DEBUG: Using explicit relationships for doc {doc.id}")
                for rel in data["relationships"]:
                    s_name = rel.get("source")
                    t_name = rel.get("target")
                    relation = rel.get("relation", "RELATED_TO").upper().replace(' ', '_')
                    
                    if not s_name or not t_name: continue

                    # Heuristic: Check against known lists to infer type
                    def infer_type(name):
                        name_lower = name.lower()
                        # Check people list first, but verify with heuristic
                        for p in data.get("people", []):
                            if p["name"].lower() == name_lower:
                                return "person" if is_likely_person(name) else "role" 
                        
                        for o in data.get("organizations", []):
                            if o["name"].lower() == name_lower: return "organization"
                        
                        for r in data.get("roles", []):
                            if r["name"].lower() == name_lower: return "role"
                            
                        # Check custom entities
                        for c in data.get("custom_entities", []):
                            if c["name"].lower() == name_lower: return c.get("type", "entity").lower()
                            
                        if name_lower == doc.filename.lower(): return "document"
                        
                        # Fallback heuristics
                        if not is_likely_person(name): return "organization" # Default non-people to org/role
                        return "entity"

                    s_type = infer_type(s_name)
                    t_type = infer_type(t_name)

                    # Create nodes
                    s_id = get_or_create_node(s_type, s_name)
                    t_id = get_or_create_node(t_type, t_name)
                    
                    if s_id and t_id:
                        all_edges.append(GraphEdge(source=s_id, target=t_id, relation=relation))
                        
                        # Use "MENTIONS" for simple document links
                        all_edges.append(GraphEdge(source=doc.id, target=s_id, relation="MENTIONS"))
                        all_edges.append(GraphEdge(source=doc.id, target=t_id, relation="MENTIONS"))

            # --- FALLBACK / HYBRID LOGIC (Legacy + Basic Linking) ---
            
            # Issuer Node
            if data.get("issuer"):
                issuer_id = get_or_create_node("issuer", data["issuer"])
                if issuer_id:
                     all_edges.append(GraphEdge(source=doc.id, target=issuer_id, relation="ISSUED_BY"))

            # Category Node
            if data.get("category"):
                cat_id = get_or_create_node("category", data["category"])
                if cat_id:
                    all_edges.append(GraphEdge(source=doc.id, target=cat_id, relation="IN_CATEGORY"))

            # Tag Nodes
            for tag in data.get("tags", []):
                tag_id = get_or_create_node("tag", tag)
                if tag_id:
                    all_edges.append(GraphEdge(source=doc.id, target=tag_id, relation="TAGGED"))

            # People Nodes (with strict check)
            for person in data.get("people", []):
                p_name = person["name"]
                if is_likely_person(p_name):
                    person_id = get_or_create_node("person", p_name, {"role": person.get("role"), "desc": person.get("description")})
                else:
                    # Reclassify as Role or Organization
                    person_id = get_or_create_node("role", p_name, {"desc": person.get("description")})
                
                if person_id:
                    all_edges.append(GraphEdge(source=doc.id, target=person_id, relation="MENTIONS"))

            # Organization Nodes
            for org in data.get("organizations", []):
                if data.get("issuer") and org["name"].lower() == data.get("issuer").lower():
                    continue
                org_id = get_or_create_node("organization", org["name"], {"type": org.get("type"), "desc": org.get("description")})
                if org_id:
                    all_edges.append(GraphEdge(source=doc.id, target=org_id, relation="MENTIONS"))
            
            # Role Nodes (NEW)
            for role in data.get("roles", []):
                role_id = get_or_create_node("role", role["name"], {"desc": role.get("description")})
                if role_id:
                     all_edges.append(GraphEdge(source=doc.id, target=role_id, relation="MENTIONS"))

            # Location Nodes
            for loc in data.get("locations", []):
                loc_id = get_or_create_node("location", loc["name"], {"type": loc.get("type")})
                if loc_id:
                    all_edges.append(GraphEdge(source=doc.id, target=loc_id, relation="LOCATED_AT"))
            
            # Custom Entity Nodes
            for ent in data.get("custom_entities", []):
                ent_type = ent.get("type", "entity").lower()
                ent_id = get_or_create_node(ent_type, ent["name"], {"desc": ent.get("description")})
                if ent_id:
                    all_edges.append(GraphEdge(source=doc.id, target=ent_id, relation="MENTIONS"))
                
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

    # 5. Calculate Activity Trends (Last 12 Months)
    from collections import defaultdict
    from datetime import datetime, timedelta
    
    activity_counts = defaultdict(int)
    today = datetime.utcnow().date()
    
    # Initialize last 12 months with 0
    for i in range(11, -1, -1):
        month_str = (today - timedelta(days=i*30)).strftime("%Y-%m")
        activity_counts[month_str] = 0
        
    for doc in docs:
        if doc.created_at:
            month_key = doc.created_at.strftime("%Y-%m")
            if month_key in activity_counts:
                activity_counts[month_key] += 1
            # Handle out of range if needed, or just extend range dynamically
            else:
                 # Check if within last 12 months roughly
                 if (today - doc.created_at.date()).days < 365:
                     activity_counts[month_key] += 1

    trends = [TrendPoint(date=k, count=v) for k, v in sorted(activity_counts.items())] # Use model ref

    # 6. Calculate Document Type Distribution
    type_counts = defaultdict(int)
    for doc in docs:
        t = doc.doc_type or "Uncategorized"
        type_counts[t] += 1
    
    distribution = [TypeDistribution(type=k, count=v) for k, v in sorted(type_counts.items(), key=lambda x: x[1], reverse=True)]

    # 7. Identify Top Collaborators (Co-occurring entities)
    # Entities that appear in the same documents
    collaborators_map = defaultdict(int) # id -> count
    collaborator_details = {} # id -> {name, role}
    
    if doc_ids_list:
        # Find all edges connected to these documents, excluding the current node
        stm = select(GraphEdge).where(
            (col(GraphEdge.source).in_(doc_ids_list)) | 
            (col(GraphEdge.target).in_(doc_ids_list))
        )
        linked_edges = session.exec(stm).all()
        
        for edge in linked_edges:
            other_id = None
            if edge.source in doc_ids_list:
                other_id = edge.target
            elif edge.target in doc_ids_list:
                other_id = edge.source
            
            if other_id and other_id != node_id and other_id not in doc_ids_list:
                collaborators_map[other_id] += 1
        
        # Get details for top 10 potential collaborators
        top_ids = sorted(collaborators_map, key=collaborators_map.get, reverse=True)[:10]
        if top_ids:
            collab_nodes = session.exec(select(GraphNode).where(col(GraphNode.id).in_(top_ids))).all()
            for n in collab_nodes:
                # Filter out documents if they accidentally got linked as "collaborators" (should cover with not in doc_ids_list but double check type)
                if n.type != 'document':
                    collaborator_details[n.id] = {"name": n.label, "role": n.properties.get("role") or n.type}

    collaborators = []
    for cid, count in sorted(collaborators_map.items(), key=lambda x: x[1], reverse=True):
        if cid in collaborator_details:
            details = collaborator_details[cid]
            collaborators.append(Collaborator(
                id=cid,
                name=details["name"],
                role=details["role"],
                count=count
            ))
            if len(collaborators) >= 5: break




    return DossierResponse(
        node_id=node.id,
        label=node.label,
        type=node.type,
        summary=f"Entity associated with {len(docs)} documents.", 
        stats=stats,
        related_documents=doc_summaries,
        related_actions=action_summaries,
        collaborators=collaborators,
        trends=trends,
        distribution=distribution
    )
