
import React, { useEffect, useState } from 'react';
import { getTimeline, TimelineItem } from '../api/timeline';
import { Section } from '../components/ui/Section';
import Card from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

const TimelinePage: React.FC = () => {
	const [items, setItems] = useState<TimelineItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setLoading(true);
		getTimeline()
			.then(setItems)
			.catch(e => setError(e.message || 'Failed to load timeline'))
			.finally(() => setLoading(false));
	}, []);

	return (
		<Section title="Upcoming Deadlines">
			<div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-xl max-w-3xl mx-auto p-0 sm:p-6 animate-fade-in">
				{loading ? (
					<div className="text-gray-500 text-lg p-8">Loading timeline...</div>
				) : error ? (
					<div className="text-red-500 font-medium p-8">{error}</div>
				) : !items.length ? (
					<div className="text-gray-500 text-lg p-8">No upcoming deadlines.</div>
				) : (
					<div className="relative px-2 sm:px-8 py-8">
						<div className="absolute left-6 sm:left-10 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-200 to-blue-400 rounded-full z-0" style={{ minHeight: '100%' }} />
						<ul className="space-y-12 relative z-10">
							{items.map((item, idx) => (
								<li key={item.id} className="flex items-start gap-4 group">
									<div className="flex flex-col items-center z-10">
										<span className={`w-8 h-8 flex items-center justify-center rounded-full border-4 ${item.severity === 'high' ? 'border-red-400 bg-red-100' : item.severity === 'medium' ? 'border-yellow-400 bg-yellow-100' : 'border-green-400 bg-green-100'} shadow-lg transition-all`}>
											{item.severity === 'high' ? (
												<svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
											) : item.severity === 'medium' ? (
												<svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
											) : (
												<svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
											)}
										</span>
										{idx !== items.length - 1 && <span className="flex-1 w-px bg-blue-200" style={{ minHeight: '32px' }} />}
									</div>
									<div className="flex-1 bg-white rounded-xl shadow-md p-6 border border-blue-100 group-hover:border-blue-400 transition-all cursor-pointer hover:scale-[1.02]" style={{ minWidth: 0 }}
										onClick={() => window.open(`/documents/${item.document_id}`, '_blank')}
									>
										<div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
											<div className="text-lg font-bold text-blue-900 truncate">{item.label}</div>
											<Badge color={item.severity === 'high' ? 'danger' : item.severity === 'medium' ? 'primary' : 'success'}>
												{item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
											</Badge>
										</div>
										<div className="text-sm text-blue-700 mt-1">Due: {item.due_date}</div>
										<div className="text-xs text-gray-500 mt-1">Type: {item.doc_type || '-'} | File: {item.filename}</div>
										{item.action && <div className="text-xs text-blue-700 font-semibold mt-2">{item.action}</div>}
									</div>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</Section>
	);
};

export default TimelinePage;
