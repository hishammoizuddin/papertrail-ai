
import React, { useEffect, useState } from 'react';
import { getTimeline, TimelineItem } from '../api/timeline';
import { Section } from '../components/ui/Section';
import { Card } from '../components/ui/Card';
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
				<Card>
					{loading ? (
						<div className="text-gray-500">Loading timeline...</div>
					) : error ? (
						<div className="text-red-500">{error}</div>
					) : !items.length ? (
						<div className="text-gray-500">No upcoming deadlines.</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full min-w-[600px] border-separate border-spacing-y-2">
								<thead>
									<tr className="bg-gray-50">
										<th className="p-3 text-left font-semibold text-gray-700">Due Date</th>
										<th className="p-3 text-left font-semibold text-gray-700">Label</th>
										<th className="p-3 text-left font-semibold text-gray-700">Severity</th>
										<th className="p-3 text-left font-semibold text-gray-700">Document</th>
										<th className="p-3 text-left font-semibold text-gray-700">Type</th>
									</tr>
								</thead>
								<tbody>
									{items.map(item => (
										<tr key={item.id} className="bg-white shadow-sm rounded-lg">
											<td className="p-3">{item.due_date}</td>
											<td className="p-3">{item.label}</td>
											<td className="p-3">
												<Badge color={item.severity === 'high' ? 'danger' : item.severity === 'medium' ? 'warning' : 'success'}>
													{item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}
												</Badge>
											</td>
											<td className="p-3">{item.filename}</td>
											<td className="p-3">{item.doc_type || '-'}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</Card>
			</Section>
		);
};

export default TimelinePage;
