

import openai
import os
import logging
import json
from typing import Dict, Any, Optional
from app.config import OPENAI_API_KEY
from pydantic import BaseModel, ValidationError

openai.api_key = OPENAI_API_KEY

CLASSIFY_PROMPT = (
	"You are a document classifier. Given the following text, classify the document type as one of: rent, bill, insurance, IRS, immigration, medical, other. "
	"Also extract the issuer (organization or sender). Output strict JSON: {\"doc_type\":..., \"issuer\":...}.\nText:\n{input}"
)

EXTRACT_PROMPT = (
	"You are an expert document analyst and knowledge graph architect. Your goal is to extract structured data to create a perfect Knowledge Map and a highly actionable Task List.\n"
	"Given the document text, perform the following detailed analysis:\n"
	"1. **Classify & Tag**: Identify the specific document type (e.g., 'Invoice', 'Lease Agreement', 'Medical Record'), a broad category (e.g., 'Finance', 'Legal', 'Health'), and add relevant tags.\n"
	"2. **Summarize**: Write a detailed, multi-paragraph summary.\n"
	"3. **Entities (CRITICAL)**: Extract entities with extreme precision.\n"
	"   - **People**: ONLY human names (e.g., 'John Smith', 'Mary Doe'). DO NOT classify roles, departments, or generic titles as People.\n"
	"   - **Organizations**: Companies, institutions, agencies, and SPECIFIC DEPARTMENTS (e.g., 'Accounts Payable', 'Billing Dept', 'IRS').\n"
	"   - **Roles**: Job titles or functions (e.g., 'Manager', 'Landlord', 'Customer Service').\n"
	"   - **Locations**: Cities, addresses, specific rooms/buildings.\n"
	"   - **Check**: Before classifying 'Accounts Payable', 'The Landlord', or 'Support Team' as a Person, STOP. These are Organizations or Roles.\n"
	"4. **Relationships**: Identify **explicit connections** between entities. Use active verbs. \n"
	"   - Examples: 'John Doe (Person) WORKS_FOR Acme Corp (Organization)', 'Payment (Action) PAYS_FOR Rent (Concept)', 'Invoice (Document) ISSUED_BY Vendor (Organization)'.\n"
	"5. **Actionable Tasks**: Identify specific deadlines and recommended next steps. Be precise (e.g., 'Pay $50.00 to Comcast').\n"
	"6. **Priority**: Assign a priority score (1-10) based on urgency.\n"
	"7. If information is missing, use null or empty arrays. Never invent.\n"
	"Output strict JSON in the following schema.\n"
	"Schema: {schema}\nText:\n{input}"
)

EXTRACT_SCHEMA = {
	"doc_type": "string",
	"issuer": "string|null",
	"category": "string|null",
	"tags": ["string"],
	"priority_score": "number", # 1-10
	"people": [{"name": "string", "role": "string|null", "description": "string|null"}], # Humans only
	"organizations": [{"name": "string", "type": "string|null", "description": "string|null"}], # Companies, Depts
	"roles": [{"name": "string", "description": "string|null"}], # Job titles, functional roles
	"locations": [{"name": "string", "type": "string|null"}],
	"relationships": [{"source": "string", "target": "string", "relation": "string", "description": "string|null"}],
	"addresses": [{"label": "string|null", "address": "string"}],
	"amounts": [{"label": "string|null", "value": "number", "currency": "string|null"}],
	"dates": [{"label": "string", "date": "YYYY-MM-DD"}],
	"deadlines": [{"action": "string", "due_date": "YYYY-MM-DD", "severity": "low|medium|high"}],
	"detailed_summary": "string",
	"summary_bullets": ["string", "..."],
	"recommended_actions": ["string", "..."]
}

class ExtractedFieldsModel(BaseModel):
	doc_type: str
	issuer: Optional[str] = None
	category: Optional[str] = None
	tags: Optional[list] = None
	priority_score: Optional[int] = None
	people: Optional[list] = None
	organizations: Optional[list] = None
	roles: Optional[list] = None # NEW
	locations: Optional[list] = None
	relationships: Optional[list] = None
	addresses: Optional[list] = None
	amounts: Optional[list] = None
	dates: Optional[list] = None
	deadlines: Optional[list] = None
	detailed_summary: Optional[str] = None
	summary_bullets: Optional[list] = None
	recommended_actions: Optional[list] = None

def classify_document(text: str) -> Dict[str, Any]:
	prompt = CLASSIFY_PROMPT.replace("{input}", text[:2000])
	logging.info(f"[OpenAI] Classification prompt: {prompt[:500]}")
	try:
		resp = openai.chat.completions.create(
			model="gpt-3.5-turbo-1106",
			messages=[{"role": "system", "content": "Classify document and extract issuer."},
					  {"role": "user", "content": prompt}],
			response_format={"type": "json_object"}
		)
		logging.info(f"[OpenAI] Classification response: {resp}")
		if resp.choices[0].message.content:
			return json.loads(resp.choices[0].message.content)
		return {"doc_type": "other", "issuer": None}
	except Exception as e:
		logging.error(f"[OpenAI] Classification error: {e}")
		return {"doc_type": "other", "issuer": None}

def extract_fields(text: str) -> Optional[Dict[str, Any]]:
	prompt = EXTRACT_PROMPT.replace("{input}", text[:4000]).replace("{schema}", str(EXTRACT_SCHEMA))
	logging.info(f"[OpenAI] Extraction prompt: {prompt[:1000]}")
	try:
		resp = openai.chat.completions.create(
			model="gpt-4o",
			messages=[{"role": "system", "content": "Extract fields as strict JSON."},
					  {"role": "user", "content": prompt}],
			response_format={"type": "json_object"}
		)
		logging.info(f"[OpenAI] Extraction response: {resp}")
		if resp.choices[0].message.content:
			data = json.loads(resp.choices[0].message.content)
			# Validate strict schema
			# Note: Pydantic v2 model_validate does not mutate in-place usually if dict is passed directly unless we instantiate model.
			# But here we just want to ensure structure is roughly correct.
			# We'll manually fix None -> [] for safety.
			for k in ["people", "organizations", "roles", "locations", "tags", "addresses", "amounts", "dates", "deadlines", "summary_bullets", "recommended_actions"]:
				if k not in data or data[k] is None:
					data[k] = []
			
			ExtractedFieldsModel.model_validate(data)
			return data
		return None
	except ValidationError as ve:
		logging.error(f"[OpenAI] Extraction validation error: {ve}")
		return None
	except Exception as e:
		logging.error(f"[OpenAI] Extraction error: {e}")
		return None
