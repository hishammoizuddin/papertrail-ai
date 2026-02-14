

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
	"You are an information extraction system. Given the following document text, extract the following fields as strict JSON. "
	"If information is missing, use null or empty arrays. Never invent.\n"
	"Schema: {schema}\nText:\n{input}"
)

EXTRACT_SCHEMA = {
	"doc_type": "string",
	"issuer": "string|null",
	"people": [{"name": "string", "role": "string|null"}],
	"addresses": [{"label": "string|null", "address": "string"}],
	"amounts": [{"label": "string|null", "value": "number", "currency": "string|null"}],
	"dates": [{"label": "string", "date": "YYYY-MM-DD"}],
	"deadlines": [{"action": "string", "due_date": "YYYY-MM-DD", "severity": "low|medium|high"}],
	"summary_bullets": ["string", "..."],
	"recommended_actions": ["string", "..."]
}

class ExtractedFieldsModel(BaseModel):
	doc_type: str
	issuer: Optional[str]
	people: list
	addresses: list
	amounts: list
	dates: list
	deadlines: list
	summary_bullets: list
	recommended_actions: list

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
			model="gpt-3.5-turbo-1106",
			messages=[{"role": "system", "content": "Extract fields as strict JSON."},
					  {"role": "user", "content": prompt}],
			response_format={"type": "json_object"}
		)
		logging.info(f"[OpenAI] Extraction response: {resp}")
		if resp.choices[0].message.content:
			data = json.loads(resp.choices[0].message.content)
			# Validate strict schema
			ExtractedFieldsModel.model_validate(data)
			return data
		return None
	except ValidationError as ve:
		logging.error(f"[OpenAI] Extraction validation error: {ve}")
		return None
	except Exception as e:
		logging.error(f"[OpenAI] Extraction error: {e}")
		return None
