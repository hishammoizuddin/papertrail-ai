from sqlmodel import Session, select
from app.models import GraphNode, GraphEdge, Document
from app.schemas import PatternReport, PatternMatch, PatternDefinition
from typing import List, Dict, Any
import openai
from app.config import OPENAI_API_KEY
import json

openai.api_key = OPENAI_API_KEY

# Pre-defined patterns (RICO styling)

def _get_graph_context_summary(session: Session, user) -> Dict[str, Any]:
    """
    Summarizes the graph content to help the LLM generate relevant patterns.
    """
    # Get distinct document types
    doc_types = session.exec(select(Document.doc_type).where(Document.user_id == user.id).distinct()).all()
    doc_types = [d for d in doc_types if d]

    # Get distinct node types
    node_types = session.exec(select(GraphNode.type).where(GraphNode.user_id == user.id).distinct()).all()
    node_types = [n for n in node_types if n]
    
    # Get distinct edge relations
    # Note: Edge relations are stored on GraphEdge. We join or just query GraphEdge if we have user_id on it?
    # GraphEdge does not distinct user_id but it links nodes.
    # For speed, let's just grab a sample of edges or rely on node types.
    # Let's query distinct relations from edges connected to user's nodes.
    # optimizing: user.id filter on nodes, then join edges... might be slow.
    # Let's just grab the first 50 edges and extract unique relations for now as a "sample".
    # Or better: "Select distinct relation from GraphEdge limit 100" (but filtered by user ownership via join is hard without correct joining)
    # Assuming standard pattern:
    # edges = session.exec(select(GraphEdge.relation).join(GraphNode, GraphEdge.source == GraphNode.id).where(GraphNode.user_id == user.id).distinct()).all()
    # That query might be complex. Let's stick to Node Types and Doc Types as the primary "Context" drivers.
    
    context = {
        "document_types": doc_types,
        "node_types": node_types,
        # "edge_relations": edges (omitted for performance, node types are usually enough context)
    }
    return context

def _generate_dynamic_patterns(context_summary: Dict[str, Any]) -> List[PatternDefinition]:
    """
    Generates investigation patterns based on the data available in the graph.
    """
    
    # If no data, return generic patterns
    if not context_summary["document_types"] and not context_summary["node_types"]:
        return []

    prompt = f"""
    You are an expert forensic investigator and data analyst.
    I have a knowledge graph created from the following types of documents and entities:
    
    Document Types: {json.dumps(context_summary['document_types'])}
    Entity Types: {json.dumps(context_summary['node_types'])}
    
    Based ONLY on this context, generate 3-5 highly relevant "Investigation Patterns" or "Red Flags" that we should automatically scan for in this graph.
    For example:
    - If you see "Invoices" and "Vendors", suggest "Kickbacks" or "Shell Companies".
    - If you see "Call Logs" and "Geolocations", suggest "Co-location Analysis".
    - If you see "Emails" and "Contracts", suggest "Hidden Clauses" or "Communication Gaps".
    
    For each pattern, provide:
    1. id: A unique snake_case string (e.g., "shell_company_risk").
    2. name: A human-readable title.
    3. description: What this pattern represents.
    4. severity: "low", "medium", "high", or "critical".
    5. prompt_template: A specific instruction for another LLM to find this pattern in a JSON representation of nodes and edges.
       The prompt_template MUST assume it is analyzing a JSON object with "nodes" and "edges".
       
    Output strict JSON format:
    {{
        "patterns": [
            {{
                "id": "...",
                "name": "...",
                "description": "...",
                "severity": "...",
                "prompt_template": "..."
            }}
        ]
    }}
    """
    
    try:
        response = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a pattern generation engine."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        patterns_data = result.get("patterns", [])
        
        patterns = []
        for p in patterns_data:
            patterns.append(PatternDefinition(
                id=p["id"],
                name=p["name"],
                description=p["description"],
                severity=p["severity"],
                prompt_template=p["prompt_template"]
            ))
            
        return patterns

    except Exception as e:
        print(f"Error generating dynamic patterns: {e}")
        return []

def detect_patterns(session: Session, user, pattern_id: str = None) -> PatternReport:
    """
    Analyzes the graph for complex patterns using LLM.
    Dynamically generates patterns based on the graph content.
    """
    
    # 1. Understand Context & Generate Patterns
    context_summary = _get_graph_context_summary(session, user)
    dynamic_patterns = _generate_dynamic_patterns(context_summary)
    
    # If specific pattern requested, try to filter (though IDs might new)
    # If pattern_id is provided, we might just match by partial string or ignore if completely new.
    # For now, we run ALL generated patterns as they are tailored to the current data.
    patterns_to_run = dynamic_patterns
    
    if not patterns_to_run:
        return PatternReport(matches=[])

    # 2. Fetch the Graph Context (Limit to 100 nodes for context window safety for now)
    # In a real heavy production app, we would use vector search to select relevant sub-graphs.
    nodes = session.exec(select(GraphNode).where(GraphNode.user_id == user.id).limit(100)).all()
    
    if len(nodes) < 2:
        return PatternReport(matches=[])

    node_ids = [n.id for n in nodes]
    edges = session.exec(select(GraphEdge).where(GraphEdge.source.in_(node_ids), GraphEdge.target.in_(node_ids))).all()

    # 3. Prepare Data for Analysis
    graph_context = {
        "nodes": [{"id": n.id, "label": n.label, "type": n.type, "properties": n.properties} for n in nodes],
        "edges": [{"source": e.source, "target": e.target, "relation": e.relation} for e in edges]
    }
    
    matches = []
    
    for pattern in patterns_to_run:
        # If user requested a specific ID and we happen to have generated it (or similar), we could filter.
        # But for dynamic "Explore" mode, we just run them all.
        if pattern_id and pattern.id != pattern_id:
             continue

        user_prompt = f"""
        Analyze the following graph data for the pattern: "{pattern.name}".
        
        Pattern Description: {pattern.description}
        Specific Instructions: {pattern.prompt_template}
        
        Graph Data:
        {json.dumps(graph_context, indent=2, default=str)}
        
        Return a JSON object with a list of matches. Each match should have:
        - involved_node_ids: A list of node IDs that are part of this pattern.
        - description: A detailed explanation of why this fits the pattern.
        - confidence: A score from 0.0 to 1.0.
        
        Response Format: {{"matches": [...]}}
        """

        try:
            response = openai.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a forensic accountant and intelligence analyst AI."},
                    {"role": "user", "content": user_prompt}
                ],
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            
            for m in result.get("matches", []):
                # Validate IDs
                valid_ids = [nid for nid in m.get("involved_node_ids", []) if any(n.id == nid for n in nodes)]
                if valid_ids:
                    matches.append(PatternMatch(
                        pattern_id=pattern.id,
                        pattern_name=pattern.name,
                        description=m.get("description"),
                        involved_node_ids=valid_ids,
                        confidence=m.get("confidence", 0.0),
                        severity=pattern.severity
                    ))
                    
        except Exception as e:
            print(f"Error analyzing pattern {pattern.id}: {e}")
            continue

    return PatternReport(matches=matches)
