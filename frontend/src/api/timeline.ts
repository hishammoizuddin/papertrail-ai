import axios from 'axios';

export interface TimelineItem {
  id: number;
  document_id: string;
  label: string;
  due_date: string;
  severity: 'low' | 'medium' | 'high';
  action?: string;
  filename: string;
  doc_type?: string;
}

export async function getTimeline(): Promise<TimelineItem[]> {
  const res = await axios.get<TimelineItem[]>('/api/timeline');
  return res.data;
}
