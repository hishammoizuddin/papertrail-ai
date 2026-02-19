from sqlmodel import Session, select
from app.models import Document, GraphNode
import zipfile
import io
# import pymupdf # assuming it's installed or we might need to mock if not available
# For now, let's implement a placeholder redaction implementation that we can expand.

def redact_entity(session: Session, user, entity_id: str):
    """
    Simulates redaction of an entity. 
    In a real implementation, this would:
    1. Mark the node as redacted in the DB.
    2. Propagate to connected nodes/docs.
    """
    # For now, we can just return success as we don't have a 'redacted' column on Node yet.
    # We might need to add it or store in metadata.
    node = session.get(GraphNode, entity_id)
    if not node:
        return False
    
    # Toggle redaction in properties
    props = node.properties or {}
    props['is_redacted'] = True
    node.properties = props
    session.add(node)
    session.commit()
    return True

def export_clean_room(session: Session, user):
    """
    Generates a ZIP file containing:
    1. A JSON dump of the graph (excluding redacted nodes).
    2. (Optional) Redacted PDFs.
    """
    # Fetch non-redacted nodes
    nodes = session.exec(select(GraphNode).where(GraphNode.user_id == user.id)).all()
    clean_nodes = []
    
    for n in nodes:
        if not n.properties or not n.properties.get('is_redacted'):
            clean_nodes.append(n.model_dump())
            
    # Create ZIP in memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # Add graph JSON
        import json
        graph_json = json.dumps({"nodes": [n for n in clean_nodes], "links": []}, default=str, indent=2)
        zip_file.writestr("clean_graph.json", graph_json)
        
        # Add a README
        zip_file.writestr("README.txt", "This is a clean-room export with redacted entities removed.")

    zip_buffer.seek(0)
    return zip_buffer
