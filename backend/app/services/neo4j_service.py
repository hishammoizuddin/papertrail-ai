"""
neo4j_service.py

Core graph business logic backed by Neo4j.
Provides upsert, rebuild, get_graph_data, dossier, and delete operations.
The API response shape (nodes/links) is kept identical to the old SQL-backed
service so the frontend needs zero changes.
"""

import json
import re
from collections import defaultdict
from datetime import datetime
from typing import Optional

from app.services.neo4j_graph import get_neo4j_driver

# ---------------------------------------------------------------------------
# Entity normalisation helpers (mirrors services/graph.py for consistency)
# ---------------------------------------------------------------------------

NON_PERSON_KEYWORDS = {
    "accounts payable", "payable", "receivable", "billing", "department", "dept",
    "manager", "director", "officer", "support", "help", "desk", "service", "customer",
    "team", "group", "committee", "board", "council", "agency", "irs", "tax",
    "government", "city", "state", "county", "unknown", "n/a", "none"
}


def _normalize_entity_name(name: str) -> str:
    if not name:
        return ""
    n = name.lower().strip()
    n = re.sub(r'[^\w\s]', '', n)
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


def _is_likely_person(name: str) -> bool:
    if not name:
        return False
    n = name.lower().strip()
    if n in NON_PERSON_KEYWORDS:
        return False
    for part in n.split():
        if part in NON_PERSON_KEYWORDS:
            return False
    if n.startswith("the "):
        return False
    return True


def _make_entity_id(user_id: str, entity_type: str, name: str) -> Optional[str]:
    """Build a scoped, stable entity ID from user_id + type + normalised slug."""
    norm = _normalize_entity_name(name)
    if not norm:
        return None
    slug = norm.replace(' ', '')
    return f"{user_id}:{entity_type}:{slug}"


# ---------------------------------------------------------------------------
# Low-level Neo4j write helpers
# ---------------------------------------------------------------------------

def _upsert_document_node(tx, doc_id: str, user_id: str, filename: str, properties: dict):
    """MERGE a :Document node and set its properties."""
    tx.run(
        """
        MERGE (d:Document {id: $id})
        SET d.user_id    = $user_id,
            d.filename   = $filename,
            d.label      = $filename,
            d.type       = 'document',
            d.summary    = $summary,
            d.priority   = $priority,
            d.date       = $date,
            d.value      = $value,
            d.currency   = $currency,
            d.created_at = $created_at
        """,
        id=doc_id,
        user_id=user_id,
        filename=filename,
        summary=properties.get("summary"),
        priority=properties.get("priority"),
        date=properties.get("date"),
        value=properties.get("value"),
        currency=properties.get("currency"),
        created_at=properties.get("created_at"),
    )


def _upsert_entity_node(tx, entity_id: str, label: str, entity_type: str,
                        user_id: str, properties: dict):
    """MERGE an :Entity node (person, org, tag, location, etc.)."""
    tx.run(
        """
        MERGE (e:Entity {id: $id})
        SET e.label     = $label,
            e.type      = $entity_type,
            e.user_id   = $user_id,
            e.role      = $role,
            e.desc      = $desc
        """,
        id=entity_id,
        label=label,
        entity_type=entity_type,
        user_id=user_id,
        role=properties.get("role"),
        desc=properties.get("desc") or properties.get("description"),
    )


def _upsert_relationship(tx, source_id: str, target_id: str, relation: str):
    """MERGE a directed relationship between two existing nodes (any label)."""
    tx.run(
        """
        MATCH (a {id: $source_id})
        MATCH (b {id: $target_id})
        MERGE (a)-[r:RELATES {type: $relation}]->(b)
        """,
        source_id=source_id,
        target_id=target_id,
        relation=relation,
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def upsert_document_to_graph(doc, extract: Optional[dict]):
    """
    Called after document ingestion succeeds.
    Merges the document node and all extracted entities/relationships into Neo4j.
    Uses MERGE throughout — safe to call multiple times (idempotent).
    """
    driver = get_neo4j_driver()

    doc_id = doc.id
    user_id = doc.user_id
    filename = doc.filename

    # Build doc-level properties
    doc_props = {
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
    }
    if extract:
        doc_props.update({
            "summary": extract.get("detailed_summary"),
            "priority": extract.get("priority_score"),
            "date": extract.get("dates", [{}])[0].get("date") if extract.get("dates") else None,
            "value": extract.get("amounts", [{}])[0].get("value") if extract.get("amounts") else None,
            "currency": extract.get("amounts", [{}])[0].get("currency") if extract.get("amounts") else None,
        })

    with driver.session() as session:
        # --- Document node ---
        session.execute_write(_upsert_document_node, doc_id, user_id, filename, doc_props)

        if not extract:
            return

        # Helper: create entity node + MENTIONS edge in one shot
        def add_entity(name, entity_type, props=None):
            eid = _make_entity_id(user_id, entity_type, name)
            if not eid:
                return None
            session.execute_write(_upsert_entity_node, eid, name.strip(), entity_type, user_id, props or {})
            session.execute_write(_upsert_relationship, doc_id, eid, "MENTIONS")
            return eid

        # --- Explicit relationships (Knowledge Graph 2.0) ---
        def infer_type(name):
            name_lower = name.lower()
            for p in extract.get("people", []):
                if p["name"].lower() == name_lower:
                    return "person" if _is_likely_person(name) else "role"
            for o in extract.get("organizations", []):
                if o["name"].lower() == name_lower:
                    return "organization"
            for r in extract.get("roles", []):
                if r["name"].lower() == name_lower:
                    return "role"
            for c in extract.get("custom_entities", []):
                if c["name"].lower() == name_lower:
                    return c.get("type", "entity").lower()
            if name_lower == doc.filename.lower():
                return "document"
            return "organization" if not _is_likely_person(name) else "entity"

        for rel in extract.get("relationships", []):
            s_name = rel.get("source")
            t_name = rel.get("target")
            relation = rel.get("relation", "RELATED_TO").upper().replace(' ', '_')
            if not s_name or not t_name:
                continue
            s_type = infer_type(s_name)
            t_type = infer_type(t_name)
            s_id = add_entity(s_name, s_type)
            t_id = add_entity(t_name, t_type)
            if s_id and t_id:
                session.execute_write(_upsert_relationship, s_id, t_id, relation)

        # --- Issuer ---
        if extract.get("issuer"):
            issuer_id = _make_entity_id(user_id, "issuer", extract["issuer"])
            if issuer_id:
                session.execute_write(_upsert_entity_node, issuer_id, extract["issuer"], "issuer", user_id, {})
                session.execute_write(_upsert_relationship, doc_id, issuer_id, "ISSUED_BY")

        # --- Category ---
        if extract.get("category"):
            cat_id = _make_entity_id(user_id, "category", extract["category"])
            if cat_id:
                session.execute_write(_upsert_entity_node, cat_id, extract["category"], "category", user_id, {})
                session.execute_write(_upsert_relationship, doc_id, cat_id, "IN_CATEGORY")

        # --- Tags ---
        for tag in extract.get("tags", []):
            tag_id = _make_entity_id(user_id, "tag", tag)
            if tag_id:
                session.execute_write(_upsert_entity_node, tag_id, tag, "tag", user_id, {})
                session.execute_write(_upsert_relationship, doc_id, tag_id, "TAGGED")

        # --- People ---
        for person in extract.get("people", []):
            p_name = person["name"]
            if _is_likely_person(p_name):
                add_entity(p_name, "person", {"role": person.get("role"), "desc": person.get("description")})
            else:
                add_entity(p_name, "role", {"desc": person.get("description")})

        # --- Organizations ---
        for org in extract.get("organizations", []):
            if extract.get("issuer") and org["name"].lower() == extract.get("issuer", "").lower():
                continue
            add_entity(org["name"], "organization", {"desc": org.get("description")})

        # --- Roles ---
        for role in extract.get("roles", []):
            add_entity(role["name"], "role", {"desc": role.get("description")})

        # --- Locations ---
        for loc in extract.get("locations", []):
            add_entity(loc["name"], "location", {})

        # --- Custom entities ---
        for ent in extract.get("custom_entities", []):
            add_entity(ent["name"], ent.get("type", "entity").lower(), {"desc": ent.get("description")})

    print(f"✅ Neo4j: ingested graph for doc {doc_id}")


def rebuild_graph_for_user(user_id: str, docs):
    """
    Full rebuild: delete all user data from Neo4j then re-ingest all docs.
    `docs` is a list of Document model objects (must have .extracted_json).
    """
    driver = get_neo4j_driver()

    # Delete all user-owned nodes + their relationships
    with driver.session() as session:
        session.run(
            """
            MATCH (n)
            WHERE n.user_id = $user_id
            DETACH DELETE n
            """,
            user_id=user_id,
        )
    print(f"🗑️  Neo4j: cleared all nodes for user {user_id}")

    for doc in docs:
        extract = None
        if doc.extracted_json:
            try:
                extract = json.loads(doc.extracted_json) if isinstance(doc.extracted_json, str) else doc.extracted_json
            except Exception:
                pass
        try:
            upsert_document_to_graph(doc, extract)
        except Exception as e:
            print(f"Warning: Neo4j upsert failed for doc {doc.id}: {e}")

    print(f"✅ Neo4j: rebuild complete for user {user_id}")


def delete_document_from_graph(doc_id: str, user_id: str):
    """
    Remove a document node and all its directly-linked entity nodes that
    are no longer connected to any other document.
    """
    driver = get_neo4j_driver()
    with driver.session() as session:
        # Collect IDs of neighbour entities before deletion
        result = session.run(
            """
            MATCH (d:Document {id: $doc_id})-[r]-(e:Entity)
            RETURN e.id AS eid
            """,
            doc_id=doc_id,
        )
        neighbour_ids = [row["eid"] for row in result]

        # Detach-delete the document node
        session.run(
            "MATCH (d:Document {id: $doc_id}) DETACH DELETE d",
            doc_id=doc_id,
        )

        # Prune orphaned entity nodes (no remaining connections)
        for eid in neighbour_ids:
            result = session.run(
                "MATCH (e:Entity {id: $eid})-[r]-() RETURN count(r) AS cnt",
                eid=eid,
            )
            cnt = result.single()["cnt"]
            if cnt == 0:
                session.run("MATCH (e:Entity {id: $eid}) DELETE e", eid=eid)

    print(f"🗑️  Neo4j: deleted doc {doc_id} and pruned orphans")


def get_graph_data(user_id: str) -> dict:
    """
    Return graph data in the same format as the old SQL service:
    { "nodes": [...], "links": [...] }
    Compatible with GraphView.tsx — no frontend changes needed.
    """
    driver = get_neo4j_driver()
    with driver.session() as session:
        # Fetch all user-owned nodes
        node_result = session.run(
            """
            MATCH (n)
            WHERE n.user_id = $user_id
            RETURN n.id AS id, n.label AS label, n.type AS type,
                   n.summary AS summary, n.priority AS priority,
                   n.date AS date, n.value AS value, n.currency AS currency,
                   n.filename AS filename, n.created_at AS created_at,
                   n.role AS role, n.desc AS desc
            """,
            user_id=user_id,
        )

        nodes = []
        node_ids = set()
        for row in node_result:
            nid = row["id"]
            node_ids.add(nid)
            ntype = (row["type"] or "entity").lower()
            props = {}
            for k in ("summary", "priority", "date", "value", "currency",
                      "filename", "created_at", "role", "desc"):
                if row[k] is not None:
                    props[k] = row[k]

            nodes.append({
                "id": nid,
                "label": row["label"] or nid,
                "type": ntype,
                "properties": props,
            })

        if not node_ids:
            return {"nodes": [], "links": []}

        # Fetch all relationships between user-owned nodes
        link_result = session.run(
            """
            MATCH (a)-[r:RELATES]->(b)
            WHERE a.user_id = $user_id AND b.user_id = $user_id
            RETURN a.id AS source, b.id AS target, r.type AS relation
            """,
            user_id=user_id,
        )

        links = [
            {"source": row["source"], "target": row["target"], "relation": row["relation"] or "RELATED_TO"}
            for row in link_result
        ]

    print(f"📊 Neo4j: get_graph_data → {len(nodes)} nodes, {len(links)} links for user {user_id}")
    return {"nodes": nodes, "links": links}


def get_entity_dossier(node_id: str, user_id: str) -> Optional[dict]:
    """
    Build an entity dossier via graph traversal.
    Returns a dict compatible with DossierResponse (handled in router).
    Returns None if not found.
    """
    driver = get_neo4j_driver()
    with driver.session() as session:
        # Fetch the node itself
        result = session.run(
            "MATCH (n {id: $node_id}) RETURN n.id AS id, n.label AS label, n.type AS type LIMIT 1",
            node_id=node_id,
        )
        row = result.single()
        if not row:
            return None

        node_label = row["label"]
        node_type = row["type"]

        # Security: verify ownership
        owner_check = session.run(
            "MATCH (n {id: $node_id}) RETURN n.user_id AS uid",
            node_id=node_id,
        ).single()
        if not owner_check or (owner_check["uid"] and owner_check["uid"] != user_id):
            return None

        # Find connected document IDs (bidirectional)
        doc_result = session.run(
            """
            MATCH (n {id: $node_id})-[r]-(d:Document)
            WHERE d.user_id = $user_id
            RETURN DISTINCT d.id AS doc_id
            """,
            node_id=node_id,
            user_id=user_id,
        )
        connected_doc_ids = [r["doc_id"] for r in doc_result]

        # Find collaborator entities (co-occur with same documents)
        collab_result = session.run(
            """
            MATCH (n {id: $node_id})-[]-(d:Document)-[]-(e:Entity)
            WHERE d.user_id = $user_id AND e.id <> $node_id
            RETURN e.id AS eid, e.label AS label, e.type AS etype, count(d) AS cnt
            ORDER BY cnt DESC
            LIMIT 8
            """,
            node_id=node_id,
            user_id=user_id,
        )
        collaborators = [
            {"id": r["eid"], "name": r["label"], "role": r["etype"], "count": r["cnt"]}
            for r in collab_result
        ]

    return {
        "node_id": node_id,
        "label": node_label,
        "type": node_type,
        "connected_doc_ids": connected_doc_ids,
        "collaborators": collaborators,
    }
