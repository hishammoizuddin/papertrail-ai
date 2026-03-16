"""
extraction.py  —  PaperTrail AI knowledge extraction pipeline

Key improvements over the previous implementation:
  1. Single GPT-4o call merges classification + extraction (no more gpt-3.5-turbo).
  2. Full-document coverage: text is processed in overlapping 6 000-char windows,
     then multi-chunk results are merged via `entity_resolution.deduplicate_extraction`.
  3. Unified entity schema: a single `entities[]` array replaces the flat
     people/organizations/roles/locations/custom_entities buckets. Backward-
     compat shims re-populate those fields so older code keeps working.
  4. Confidence scoring on every entity and relationship (0.0–1.0).
  5. Alias extraction enables downstream fuzzy entity resolution.
  6. OpenAI structured-output (json_schema) mode eliminates free-form JSON
     hallucinations.
"""

from __future__ import annotations

import json
import logging
import math
import os
import textwrap
from typing import Any, Optional

import openai
from app.config import OPENAI_API_KEY
from app.services.entity_resolution import (
    canonicalize_relation,
    deduplicate_extraction,
    fuzzy_merge_entities,
)
from pydantic import BaseModel, ValidationError

openai.api_key = OPENAI_API_KEY

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CHUNK_SIZE = 6_000     # characters per extraction window
CHUNK_OVERLAP = 800    # overlap between windows
CONFIDENCE_THRESHOLD = 0.45   # entities/rels below this are not written to graph

# ---------------------------------------------------------------------------
# System prompt  (merged classify + extract)
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = textwrap.dedent("""
You are an expert document analyst and knowledge graph architect.
Your job is to extract structured knowledge from document text to power a
Knowledge Map showing entities, relationships, and actionable intelligence.

OUTPUT RULES:
1. Return ONLY valid JSON matching the schema provided — no prose, no markdown fences.
2. Never invent data not present in or strongly implied by the text.
3. For every entity and relationship, assign a confidence score (0.0–1.0) reflecting
   how certain you are it is correctly identified.
4. Entities below 0.4 confidence should still be included but marked — the caller
   will filter them.
5. Assign canonical_name = the most official/complete form of the name.
   Populate aliases with any alternate spellings, abbreviations, or short forms
   found in the text (e.g. "Internal Revenue Service" → aliases: ["IRS"]).
6. Entity types MUST be exactly one of:
   person | organization | location | role | statute | event | asset | concept | other
7. Relationship `relation` should be a plain English verb phrase (e.g. "works for",
   "issued by", "references"). The caller will map it to a canonical edge type.
8. If a field has no data, use null or []. Never omit required keys.
""").strip()

_USER_PROMPT_TEMPLATE = textwrap.dedent("""
Extract all structured knowledge from the following document text.
This may be a partial chunk of a longer document — extract everything you can see.

SCHEMA (output must match exactly):
{schema}

DOCUMENT TEXT:
{text}
""").strip()

# ---------------------------------------------------------------------------
# JSON Schema for OpenAI structured output
# ---------------------------------------------------------------------------

_RESPONSE_SCHEMA = {
    "name": "document_extraction",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "doc_type", "issuer", "category", "tags", "priority_score",
            "entities", "relationships",
            "dates", "amounts", "addresses", "deadlines",
            "detailed_summary", "summary_bullets", "recommended_actions"
        ],
        "properties": {
            "doc_type": {
                "type": "string",
                "description": (
                    "Specific document type, e.g. 'Residential Lease', "
                    "'W-2 Tax Form', 'Medical Invoice', 'Court Summons'."
                )
            },
            "issuer": {
                "type": ["string", "null"],
                "description": "Organization or person that issued/sent this document."
            },
            "category": {
                "type": ["string", "null"],
                "description": (
                    "High-level domain category: e.g. 'Real Estate', "
                    "'Healthcare', 'Legal', 'Personal Finance', 'Government', 'Employment'."
                )
            },
            "tags": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Relevant keyword tags."
            },
            "priority_score": {
                "type": ["number", "null"],
                "description": "Urgency score 1–10 (10 = most urgent)."
            },
            "entities": {
                "type": "array",
                "description": "All meaningful entities mentioned in the document.",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["name", "canonical_name", "aliases", "type",
                                 "role", "description", "confidence"],
                    "properties": {
                        "name": {"type": "string"},
                        "canonical_name": {
                            "type": "string",
                            "description": "Most complete / official form of the name."
                        },
                        "aliases": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Alternate spellings, abbreviations, short forms."
                        },
                        "type": {
                            "type": "string",
                            "enum": [
                                "person", "organization", "location", "role",
                                "statute", "event", "asset", "concept", "other"
                            ]
                        },
                        "role": {
                            "type": ["string", "null"],
                            "description": "Functional role in this document context."
                        },
                        "description": {
                            "type": ["string", "null"],
                            "description": "Brief description based solely on document text."
                        },
                        "confidence": {
                            "type": "number",
                            "description": "Extraction confidence 0.0–1.0."
                        }
                    }
                }
            },
            "relationships": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["source", "target", "relation", "description", "confidence"],
                    "properties": {
                        "source": {"type": "string", "description": "Source entity name."},
                        "target": {"type": "string", "description": "Target entity name."},
                        "relation": {
                            "type": "string",
                            "description": "Plain English verb phrase, e.g. 'issued by', 'works for'."
                        },
                        "description": {"type": ["string", "null"]},
                        "confidence": {"type": "number"}
                    }
                }
            },
            "dates": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["label", "date"],
                    "properties": {
                        "label": {"type": "string"},
                        "date": {"type": "string", "description": "ISO 8601 date YYYY-MM-DD."}
                    }
                }
            },
            "amounts": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["label", "value", "currency"],
                    "properties": {
                        "label": {"type": ["string", "null"]},
                        "value": {"type": "number"},
                        "currency": {"type": ["string", "null"]}
                    }
                }
            },
            "addresses": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["label", "address"],
                    "properties": {
                        "label": {"type": ["string", "null"]},
                        "address": {"type": "string"}
                    }
                }
            },
            "deadlines": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["action", "due_date", "severity"],
                    "properties": {
                        "action": {"type": "string"},
                        "due_date": {"type": "string", "description": "ISO 8601 YYYY-MM-DD."},
                        "severity": {"type": "string", "enum": ["low", "medium", "high"]}
                    }
                }
            },
            "detailed_summary": {
                "type": ["string", "null"],
                "description": "Multi-paragraph summary of the document."
            },
            "summary_bullets": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Key facts as short bullet points."
            },
            "recommended_actions": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Specific next steps the document owner should take."
            }
        }
    }
}

# Compact schema shown inside the prompt (saves tokens)
_SCHEMA_HINT = (
    "{ doc_type, issuer, category, tags[], priority_score, "
    "entities[{name, canonical_name, aliases[], type, role, description, confidence}], "
    "relationships[{source, target, relation, description, confidence}], "
    "dates[{label, date}], amounts[{label, value, currency}], "
    "addresses[{label, address}], deadlines[{action, due_date, severity}], "
    "detailed_summary, summary_bullets[], recommended_actions[] }"
)

# ---------------------------------------------------------------------------
# Pydantic result model (validation layer)
# ---------------------------------------------------------------------------

class ExtractionResult(BaseModel):
    doc_type: str
    issuer: Optional[str] = None
    category: Optional[str] = None
    tags: list = []
    priority_score: Optional[float] = None
    entities: list = []
    relationships: list = []
    dates: list = []
    amounts: list = []
    addresses: list = []
    deadlines: list = []
    detailed_summary: Optional[str] = None
    summary_bullets: list = []
    recommended_actions: list = []

    # Legacy flat fields (populated from entities for backward compatibility)
    people: list = []
    organizations: list = []
    roles: list = []
    locations: list = []
    custom_entities: list = []


# ---------------------------------------------------------------------------
# Internal helper: single chunk extraction
# ---------------------------------------------------------------------------

def _extract_chunk(text: str) -> Optional[dict[str, Any]]:
    """Call GPT-4o for one text chunk. Returns parsed dict or None on failure."""
    prompt = _USER_PROMPT_TEMPLATE.format(schema=_SCHEMA_HINT, text=text)
    try:
        resp = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={
                "type": "json_schema",
                "json_schema": _RESPONSE_SCHEMA,
            },
            temperature=0.1,   # low temperature → more deterministic
        )
        raw = resp.choices[0].message.content
        if not raw:
            return None
        data = json.loads(raw)
        # Ensure list fields exist
        for k in (
            "entities", "relationships", "tags", "dates", "amounts",
            "addresses", "deadlines", "summary_bullets", "recommended_actions"
        ):
            if k not in data or data[k] is None:
                data[k] = []
        return data
    except Exception as e:
        logging.error(f"[extraction] chunk error: {e}")
        return None


# ---------------------------------------------------------------------------
# Internal helper: build legacy flat fields from entities
# ---------------------------------------------------------------------------

_ENTITY_TYPE_TO_LEGACY: dict[str, str] = {
    "person": "people",
    "organization": "organizations",
    "location": "locations",
    "role": "roles",
}

def _build_legacy_fields(data: dict[str, Any]) -> dict[str, Any]:
    """
    Populate the flat people/organizations/roles/locations/custom_entities
    arrays from the unified entities list, so older code keeps working.
    """
    people: list = []
    organizations: list = []
    roles: list = []
    locations: list = []
    custom_entities: list = []

    for ent in data.get("entities") or []:
        t = (ent.get("type") or "other").lower()
        if t == "person":
            people.append({
                "name": ent.get("canonical_name") or ent.get("name"),
                "role": ent.get("role"),
                "description": ent.get("description"),
            })
        elif t == "organization":
            organizations.append({
                "name": ent.get("canonical_name") or ent.get("name"),
                "type": ent.get("role"),
                "description": ent.get("description"),
            })
        elif t == "role":
            roles.append({
                "name": ent.get("canonical_name") or ent.get("name"),
                "description": ent.get("description"),
            })
        elif t == "location":
            locations.append({
                "name": ent.get("canonical_name") or ent.get("name"),
                "type": ent.get("role"),
            })
        else:
            custom_entities.append({
                "name": ent.get("canonical_name") or ent.get("name"),
                "type": t,
                "description": ent.get("description"),
            })

    data["people"] = people
    data["organizations"] = organizations
    data["roles"] = roles
    data["locations"] = locations
    data["custom_entities"] = custom_entities
    return data


# ---------------------------------------------------------------------------
# Internal helper: enrich relationships with canonical type
# ---------------------------------------------------------------------------

def _enrich_relationships(data: dict[str, Any]) -> dict[str, Any]:
    """Add `canonical_relation` to each relationship dict."""
    for rel in data.get("relationships") or []:
        rel["canonical_relation"] = canonicalize_relation(
            rel.get("canonical_relation") or rel.get("relation") or ""
        )
    return data


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def extract_fields(text: str) -> Optional[dict[str, Any]]:
    """
    Full extraction pipeline:
      1. Split text into overlapping 6 000-char chunks.
      2. Extract each chunk with GPT-4o.
      3. Merge results with `deduplicate_extraction`.
      4. Fuzzy-merge entities.
      5. Filter low-confidence entities/relationships.
      6. Enrich relationships with canonical types.
      7. Build legacy flat fields for backward compat.
      8. Validate with Pydantic.
    """
    if not text or not text.strip():
        return None

    # 1. Chunk
    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = min(start + CHUNK_SIZE, len(text))
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start = end - CHUNK_OVERLAP

    logging.info(f"[extraction] Processing {len(chunks)} chunk(s) from {len(text)}-char document")

    # 2. Extract each chunk
    results: list[dict[str, Any]] = []
    for i, chunk in enumerate(chunks):
        logging.info(f"[extraction] Extracting chunk {i + 1}/{len(chunks)}")
        result = _extract_chunk(chunk)
        if result:
            results.append(result)

    if not results:
        logging.error("[extraction] All chunks failed extraction")
        return None

    # 3. Merge chunk results
    data = deduplicate_extraction(results)

    # 4. Fuzzy-merge entities
    data["entities"] = fuzzy_merge_entities(data.get("entities") or [])

    # 5. Filter low-confidence items
    data["entities"] = [
        e for e in data["entities"]
        if float(e.get("confidence", 1.0)) >= CONFIDENCE_THRESHOLD
    ]
    data["relationships"] = [
        r for r in data.get("relationships") or []
        if float(r.get("confidence", 1.0)) >= CONFIDENCE_THRESHOLD
    ]

    # 6. Canonical relationship types
    data = _enrich_relationships(data)

    # 7. Build legacy flat fields
    data = _build_legacy_fields(data)

    # 8. Validate
    try:
        ExtractionResult.model_validate(data)
    except ValidationError as ve:
        logging.error(f"[extraction] Validation error: {ve}")
        # Still return data — partial results are better than nothing
        pass

    logging.info(
        f"[extraction] Complete: {len(data.get('entities', []))} entities, "
        f"{len(data.get('relationships', []))} relationships"
    )
    return data


def classify_document(text: str) -> dict[str, Any]:
    """
    Lightweight classification shim — now calls extract_fields on a short
    prefix and reads doc_type + issuer. Eliminates the separate gpt-3.5-turbo
    call while keeping the same interface for callers.
    """
    # Use only the first CHUNK_SIZE chars for a fast classify-only call
    snippet = text[: CHUNK_SIZE]
    result = _extract_chunk(snippet)
    if result:
        return {
            "doc_type": result.get("doc_type", "other"),
            "issuer": result.get("issuer"),
        }
    return {"doc_type": "other", "issuer": None}
