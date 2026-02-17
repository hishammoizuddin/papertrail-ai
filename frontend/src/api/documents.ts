import axios from 'axios';

export interface Document {
  id: string;
  filename: string;
  path: string;
  created_at: string;
  doc_type?: string;
  issuer?: string;
  primary_due_date?: string;
  extracted_json?: any;
  status: string;
  error_message?: string;
}

export async function listDocuments(): Promise<Document[]> {
  const res = await axios.get<Document[]>('/api/documents/');
  return res.data;
}

export async function uploadDocument(file: File): Promise<Document> {
  const form = new FormData();
  form.append('file', file);
  const res = await axios.post<Document>('/api/documents/', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function processDocument(documentId: string): Promise<Document> {
  const res = await axios.post<Document>(`/api/documents/${documentId}/process`);
  return res.data;
}

export async function getDocument(documentId: string): Promise<Document> {
  const res = await axios.get<Document>(`/api/documents/${documentId}`);
  return res.data;
}

export function getDocumentPdfUrl(documentId: string): string {
  return `/api/documents/${documentId}/pdf`;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await axios.delete(`/api/documents/${documentId}`);
}
