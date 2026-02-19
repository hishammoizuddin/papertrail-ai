from sqlmodel import Session, select
from app.models import GraphNode, GraphEdge, Document
from app.schemas import PatternReport, PatternMatch, PatternDefinition
from typing import List, Dict, Any
import openai
from app.config import OPENAI_API_KEY
import json

openai.api_key = OPENAI_API_KEY

# Pre-defined patterns (RICO styling)
DEFAULT_PATTERNS = [
    PatternDefinition(
        id="shell_company",
        name="Potential Shell Company",
        description="Entities with high transaction volume but little operational footprint, often linked to offshore locations or vague addresses.",
        severity="high",
        prompt_template="Analyze the graph for entities that look like shell companies. Look for: 1. Companies with vague names. 2. Shared addresses with other unrelated companies. 3. High financial flows without clear business purpose. 4. Connections to known tax havens."
    ),
    PatternDefinition(
        id="money_laundering",
        name="Money Laundering Indicators",
        description="Circular flow of funds, rapid movement of exact amounts between multiple entities, or structuring of payments.",
        severity="critical",
        prompt_template="Analyze the graph for signs of money laundering. Look for: 1. Circular transactions (A -> B -> C -> A). 2. Rapid layering of funds. 3. Large round-number transactions. 4. Payments exceeding typical business logic."
    ),
    PatternDefinition(
        id="kickbacks",
        name="Kickbacks / Conflict of Interest",
        description="Payments or favors between parties that should be arms-length, or personal connections between vendors and employees.",
        severity="high",
        prompt_template="Analyze the graph for conflicts of interest or kickbacks. Look for: 1. Personal relationships between vendor and employee. 2. Payments to personal accounts. 3. Unusually high pricing for services compared to market."
    )
]

def detect_patterns(session: Session, user, pattern_id: str = None) -> PatternReport:
    """
    Analyzes the graph for complex patterns using LLM.
    If pattern_id is provided, runs only that pattern. Otherwise runs all.
    """
    
    # 1. Fetch the Graph Context (Limit to 100 nodes for context window safety for now)
    # In a real heavy production app, we would use vector search to select relevant sub-graphs.
    nodes = session.exec(select(GraphNode).where(GraphNode.user_id == user.id).limit(100)).all()
    
    if len(nodes) < 2:
        return PatternReport(matches=[])

    node_ids = [n.id for n in nodes]
    edges = session.exec(select(GraphEdge).where(GraphEdge.source.in_(node_ids), GraphEdge.target.in_(node_ids))).all()

    # 2. Prepare Context
    graph_context = {
        "nodes": [{"id": n.id, "label": n.label, "type": n.type, "properties": n.properties} for n in nodes],
        "edges": [{"source": e.source, "target": e.target, "relation": e.relation} for e in edges]
    }
    
    matches = []
    
    patterns_to_run = [p for p in DEFAULT_PATTERNS if p.id == pattern_id] if pattern_id else DEFAULT_PATTERNS
    
    for pattern in patterns_to_run:
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
