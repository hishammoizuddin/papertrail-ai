import axios from 'axios';

export interface ChatCitation {
  document_id: string;
  filename: string;
  page: number;
  chunk_id: string;
}

export interface ChatResponse {
  answer: string;
  citations: ChatCitation[];
}

export async function chat(message: string, document_id?: string, top_k: number = 10, history?: { role: string; content: string }[]): Promise<ChatResponse> {
  const res = await axios.post<ChatResponse>('/api/chat', {
    message,
    document_id,
    top_k,
    history,
  });
  return res.data;
}
