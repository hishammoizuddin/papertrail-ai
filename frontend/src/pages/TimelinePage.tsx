
import React, { useEffect, useState } from 'react';
import { getTimeline, TimelineItem } from '../api/timeline';

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
		<div className="max-w-3xl mx-auto py-8">
			<h1 className="text-2xl font-bold mb-4">Upcoming Deadlines</h1>
			{loading ? (
				<div>Loading timeline...</div>
			) : error ? (
				<div className="text-red-500">{error}</div>
			) : !items.length ? (
				<div className="text-gray-500">No upcoming deadlines.</div>
			) : (
				<table className="w-full border bg-white">
					<thead>
						<tr className="bg-gray-100">
							<th className="p-2 text-left">Due Date</th>
							<th className="p-2 text-left">Label</th>
							<th className="p-2 text-left">Severity</th>
							<th className="p-2 text-left">Document</th>
							<th className="p-2 text-left">Type</th>
						</tr>
					</thead>
					<tbody>
						{items.map(item => (
							<tr key={item.id} className="border-t">
								<td className="p-2">{item.due_date}</td>
								<td className="p-2">{item.label}</td>
								<td className={`p-2 ${item.severity === 'high' ? 'text-red-600' : item.severity === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>{item.severity}</td>
								<td className="p-2">{item.filename}</td>
								<td className="p-2">{item.doc_type || '-'}</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
};

export default TimelinePage;
