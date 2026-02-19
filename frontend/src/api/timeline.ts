import axios from 'axios';

export interface TimelineEvent {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  description?: string;
  type: string; // 'document_upload', 'deadline', 'meeting', 'transaction', 'document_date'
  related_node_id?: string;
}

export interface TimelineResponse {
  events: TimelineEvent[];
}

export async function getTimeline(): Promise<TimelineEvent[]> {
  const token = localStorage.getItem('token');
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await axios.get<TimelineResponse>('/api/timeline/', { headers });
  return res.data.events;
}
