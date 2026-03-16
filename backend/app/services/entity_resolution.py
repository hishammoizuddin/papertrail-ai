"""
entity_resolution.py

Utilities for:
1. Canonicalising relationship verb strings to a fixed ontology.
2. Fuzzy-merging entity lists so aliases collapse to a single canonical node.
3. Deduplicating / merging extraction results from multiple text chunks.
"""

from __future__ import annotations

from difflib import SequenceMatcher
from typing import Any
import re

# ---------------------------------------------------------------------------
# Relationship verb → canonical Neo4j edge type
# ---------------------------------------------------------------------------

RELATION_CANONICAL_MAP: dict[str, str] = {
    # Issuance / origin
    "issued_by": "ISSUED_BY",
    "sent_by": "ISSUED_BY",
    "created_by": "ISSUED_BY",
    "authored_by": "ISSUED_BY",
    "from": "ISSUED_BY",
    "prepared_by": "ISSUED_BY",

    # Signing / execution
    "signed_by": "SIGNED_BY",
    "signed": "SIGNED_BY",
    "executed_by": "SIGNED_BY",
    "witnessed_by": "SIGNED_BY",

    # References / cites
    "references": "REFERENCES",
    "cites": "REFERENCES",
    "pursuant_to": "REFERENCES",
    "under": "REFERENCES",
    "governed_by": "REFERENCES",

    # Subject / about
    "subject": "SUBJECT",
    "regarding": "SUBJECT",
    "concerns": "SUBJECT",
    "about": "SUBJECT",
    "pertains_to": "SUBJECT",

    # Location
    "located_in": "LOCATED_AT",
    "located_at": "LOCATED_AT",
    "address": "LOCATED_AT",

    # Involvement (secondary parties)
    "involves": "INVOLVES",
    "parties": "INVOLVES",
    "between": "INVOLVES",
    "cc": "INVOLVES",

    # Financial
    "charges": "HAS_AMOUNT",
    "costs": "HAS_AMOUNT",
    "invoices": "HAS_AMOUNT",
    "has_amount": "HAS_AMOUNT",
    "billed_to": "HAS_AMOUNT",

    # Deadlines / dates
    "due_by": "HAS_DEADLINE",
    "expires_on": "HAS_DEADLINE",
    "deadline": "HAS_DEADLINE",
    "has_deadline": "HAS_DEADLINE",
    "renews_on": "HAS_DEADLINE",

    # Employment / membership
    "works_for": "WORKS_FOR",
    "employed_by": "WORKS_FOR",
    "member_of": "WORKS_FOR",
    "represents": "WORKS_FOR",

    # Ownership
    "owns": "OWNS",
    "owned_by": "OWNS",
    "leased_by": "OWNS",
    "rented_by": "OWNS",

    # Generic fallback
    "mentions": "MENTIONS",
    "related_to": "MENTIONS",
    "associated_with": "MENTIONS",
}


def canonicalize_relation(verb: str) -> str:
    """
    Maps a raw relationship verb emitted by the LLM to a canonical edge type.
    Lowercases, strips whitespace, replaces spaces with underscores, then looks
    up in the map. Falls back to MENTIONS.
    """
    if not verb:
        return "MENTIONS"
    key = re.sub(r"[^a-z0-9_]", "_", verb.lower().strip()).strip("_")
    # Try exact match
    if key in RELATION_CANONICAL_MAP:
        return RELATION_CANONICAL_MAP[key]
    # Try prefix match (e.g. "issued_by_authority" → "issued_by")
    for k, v in RELATION_CANONICAL_MAP.items():
        if key.startswith(k):
            return v
    return "MENTIONS"


# ---------------------------------------------------------------------------
# Entity fuzzy merging
# ---------------------------------------------------------------------------

_TITLE_PREFIXES = re.compile(
    r"^(mr\.?|mrs\.?|ms\.?|dr\.?|prof\.?|sir|the)\s+", re.IGNORECASE
)

def _normalize_for_comparison(name: str) -> str:
    """Strip titles, punctuation, extra whitespace for fuzzy comparison."""
    n = _TITLE_PREFIXES.sub("", name.strip())
    n = re.sub(r"[^a-z0-9\s]", "", n.lower())
    # Common corporate suffixes
    for sfx in (" incorporated", " corporation", " limited", " company",
                " inc", " corp", " llc", " ltd", " co", " plc", " sa", " gmbh"):
        if n.endswith(sfx):
            n = n[: -len(sfx)].strip()
            break
    return n.strip()


def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def fuzzy_merge_entities(
    entities: list[dict[str, Any]],
    threshold: float = 0.85,
) -> list[dict[str, Any]]:
    """
    Collapse near-duplicate entities of the same type into one canonical node.

    Rules:
    - Only merges entities with the same ``type``.
    - Uses normalized form for similarity; keeps the *longest* name as the
      canonical label (most informative).
    - Merges aliases lists and picks the highest confidence value.

    Returns a deduplicated list where each item has an extra ``aliases`` key.
    """
    if not entities:
        return []

    merged: list[dict[str, Any]] = []

    for entity in entities:
        name = (entity.get("canonical_name") or entity.get("name") or "").strip()
        etype = (entity.get("type") or "entity").lower()
        norm = _normalize_for_comparison(name)
        confidence = float(entity.get("confidence", 1.0))
        aliases: list[str] = list(entity.get("aliases") or [])

        # Try to find an existing merged group to absorb into
        absorbed = False
        for existing in merged:
            if existing["type"] != etype:
                continue
            existing_norm = _normalize_for_comparison(
                existing.get("canonical_name") or existing.get("name") or ""
            )
            # Also compare against known aliases of existing
            candidates = [existing_norm] + [
                _normalize_for_comparison(a) for a in existing.get("aliases", [])
            ]
            if any(_similarity(norm, c) >= threshold for c in candidates):
                # Merge: pick longest canonical name
                existing_canonical = existing.get("canonical_name") or existing.get("name") or ""
                if len(name) > len(existing_canonical):
                    existing["canonical_name"] = name
                    existing["name"] = name
                # Merge aliases
                combined_aliases: set[str] = set(existing.get("aliases") or [])
                combined_aliases.add(name)
                combined_aliases.update(aliases)
                existing_canonical_lower = (
                    existing.get("canonical_name") or existing.get("name") or ""
                ).lower()
                combined_aliases.discard(existing_canonical_lower)
                existing["aliases"] = list(combined_aliases)
                # Take max confidence
                existing["confidence"] = max(existing.get("confidence", 0.0), confidence)
                # Merge description
                if not existing.get("description") and entity.get("description"):
                    existing["description"] = entity["description"]
                absorbed = True
                break

        if not absorbed:
            entry = {
                **entity,
                "name": name,
                "canonical_name": name,
                "type": etype,
                "confidence": confidence,
                "aliases": aliases,
            }
            merged.append(entry)

    return merged


# ---------------------------------------------------------------------------
# Multi-chunk extraction merger
# ---------------------------------------------------------------------------

def _merge_list_field(
    base: list[Any],
    extra: list[Any],
    key: str = "name",
    threshold: float = 0.85,
) -> list[Any]:
    """
    Append items from `extra` into `base` if no sufficiently-similar item
    (compared by `key`) already exists.
    """
    used_norms = {_normalize_for_comparison(str(b.get(key, ""))) for b in base}
    for item in extra:
        norm = _normalize_for_comparison(str(item.get(key, "")))
        if not any(_similarity(norm, u) >= threshold for u in used_norms):
            base.append(item)
            used_norms.add(norm)
    return base


def deduplicate_extraction(extractions: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Merge multiple per-chunk extraction dicts into a single coherent dict.

    Strategy:
    - Scalar fields (doc_type, issuer, category, detailed_summary …): take from
      the first non-null occurrence. Summary is concatenated.
    - priority_score: take maximum.
    - List fields: deduplicate using fuzzy name matching.
    - entities (unified list): run fuzzy_merge_entities.
    """
    if not extractions:
        return {}
    if len(extractions) == 1:
        return extractions[0]

    merged: dict[str, Any] = {}

    # Scalar fields — first non-null wins
    for key in ("doc_type", "issuer", "category"):
        for ex in extractions:
            if ex.get(key):
                merged[key] = ex[key]
                break

    # Priority — max
    priorities = [ex.get("priority_score") for ex in extractions if ex.get("priority_score")]
    merged["priority_score"] = max(priorities) if priorities else None

    # Summaries — concatenate unique sentences
    summaries = [ex.get("detailed_summary") or "" for ex in extractions]
    merged["detailed_summary"] = " ".join(s for s in summaries if s).strip() or None

    # Bullet summaries — concatenate unique bullets
    bullets: list[str] = []
    seen_bullets: set[str] = set()
    for ex in extractions:
        for b in ex.get("summary_bullets") or []:
            norm = b.strip().lower()
            if norm not in seen_bullets:
                bullets.append(b)
                seen_bullets.add(norm)
    merged["summary_bullets"] = bullets

    # Recommended actions
    actions: list[str] = []
    seen_actions: set[str] = set()
    for ex in extractions:
        for a in ex.get("recommended_actions") or []:
            norm = a.strip().lower()
            if norm not in seen_actions:
                actions.append(a)
                seen_actions.add(norm)
    merged["recommended_actions"] = actions

    # Tags
    tags: list[str] = []
    seen_tags: set[str] = set()
    for ex in extractions:
        for t in ex.get("tags") or []:
            if t.lower() not in seen_tags:
                tags.append(t)
                seen_tags.add(t.lower())
    merged["tags"] = tags

    # Entities (unified)
    all_entities: list[dict] = []
    for ex in extractions:
        all_entities.extend(ex.get("entities") or [])
    merged["entities"] = fuzzy_merge_entities(all_entities)

    # Legacy flat entity lists (backward compat — also merge if present)
    for list_field in ("people", "organizations", "roles", "locations", "custom_entities"):
        combined: list[Any] = []
        for ex in extractions:
            combined = _merge_list_field(combined, ex.get(list_field) or [])
        merged[list_field] = combined

    # Relationships — deduplicate by (source, target, relation) triple
    seen_rels: set[tuple] = set()
    rels: list[dict] = []
    for ex in extractions:
        for r in ex.get("relationships") or []:
            key_tuple = (
                _normalize_for_comparison(r.get("source", "")),
                _normalize_for_comparison(r.get("target", "")),
                (r.get("canonical_relation") or r.get("relation") or "").upper(),
            )
            if key_tuple not in seen_rels:
                rels.append(r)
                seen_rels.add(key_tuple)
    merged["relationships"] = rels

    # Dates, amounts, addresses, deadlines — simple concat + deduplicate by value
    for list_field in ("dates", "amounts", "addresses", "deadlines"):
        combined = []
        seen_vals: set[str] = set()
        for ex in extractions:
            for item in ex.get(list_field) or []:
                val = str(item.get("date") or item.get("value") or item.get("address") or item.get("action") or "")
                if val not in seen_vals:
                    combined.append(item)
                    seen_vals.add(val)
        merged[list_field] = combined

    return merged
