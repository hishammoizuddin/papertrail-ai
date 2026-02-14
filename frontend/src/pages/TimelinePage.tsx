
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
			<div className="bg-white rounded-lg shadow p-8 max-w-3xl mx-auto">
				{loading ? (
					<div className="text-gray-500 text-lg">Loading timeline...</div>
				) : error ? (
					<div className="text-red-500 font-medium">{error}</div>
				) : !items.length ? (
					<div className="text-gray-500 text-lg">No upcoming deadlines.</div>
				) : (
					<ul className="space-y-6">
						{items.map(item => (
							<li key={item.id} className="bg-blue-50 border border-blue-200 rounded-lg p-6 flex flex-col md:flex-row md:items-center gap-4 shadow">
								<div className="flex-1">
									<div className="text-lg font-bold text-blue-900">{item.label}</div>
									<div className="text-sm text-blue-700">Due: {item.due_date}</div>
									<div className="text-xs text-gray-500">Type: {item.doc_type || '-'} | File: {item.filename}</div>
								</div>
								<Badge color={item.severity === 'high' ? 'danger' : item.severity === 'medium' ? 'primary' : 'success'}>
									{item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
								</Badge>
								{item.action && <div className="text-xs text-blue-700 font-semibold">{item.action}</div>}
							</li>
						))}
					</ul>
				)}
			</div>
		</Section>
		);
};

export default TimelinePage;
