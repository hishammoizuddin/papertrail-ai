
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
			<Card className="max-w-3xl mx-auto p-8 animate-fade-in min-h-[50vh]">
				{loading ? (
					<div className="flex justify-center items-center py-20 text-gray-400">Loading timeline...</div>
				) : error ? (
					<div className="text-red-500 font-medium py-10 text-center">{error}</div>
				) : !items.length ? (
					<div className="text-gray-500 text-center py-20">No upcoming deadlines found.</div>
				) : (
					<div className="relative pl-4 sm:pl-8 py-4">
						<div className="absolute left-6 sm:left-10 top-2 bottom-0 w-[2px] bg-gray-100 rounded-full z-0" />
						<ul className="space-y-10 relative z-10">
							{items.map((item, idx) => (
								<li key={item.id} className="flex items-start gap-6 group">
									<div className="flex flex-col items-center z-10 pt-1">
										<span className={`w-4 h-4 rounded-full border-[3px] bg-white pointer-events-none ring-4 ring-white ${item.severity === 'high' ? 'border-red-500'
												: item.severity === 'medium' ? 'border-yellow-400'
													: 'border-green-500'
											}`} />
									</div>
									<div className="flex-1 -mt-1 hover:bg-gray-50/80 p-4 -ml-4 rounded-2xl transition-all cursor-pointer group-hover:shadow-sm"
										onClick={() => window.open(`/documents/${item.document_id}`, '_blank')}
									>
										<div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 sm:gap-4 mb-1">
											<h3 className="text-base font-semibold text-gray-900 leading-tight">{item.label}</h3>
											<span className="text-xs font-medium text-gray-400 whitespace-nowrap">{item.due_date}</span>
										</div>
										<p className="text-sm text-gray-500 mb-3">{item.action || 'No additional action required.'}</p>

										<div className="flex items-center gap-3">
											<Badge color={item.severity === 'high' ? 'danger' : item.severity === 'medium' ? 'warning' : 'success'}>
												{item.severity.charAt(0).toUpperCase() + item.severity.slice(1)} Priority
											</Badge>
											<span className="text-xs text-gray-400 flex items-center gap-1">
												<svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
												{item.filename}
											</span>
										</div>
									</div>
								</li>
							))}
						</ul>
					</div>
				)}
			</Card>
		</Section>
	);
};

export default TimelinePage;
