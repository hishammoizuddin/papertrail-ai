
import React, { useEffect, useState } from 'react';
import { getTimeline, TimelineEvent } from '../api/timeline';
import { Section } from '../components/ui/Section';
import { Badge } from '../components/ui/Badge';
import { Calendar, FileText, AlertCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const TimelinePage: React.FC = () => {
	const [events, setEvents] = useState<TimelineEvent[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setLoading(true);
		getTimeline()
			.then(setEvents)
			.catch(e => setError(e.message || 'Failed to load timeline'))
			.finally(() => setLoading(false));
	}, []);

	// Group events by Month/Year
	const groupedEvents = events.reduce((acc, event) => {
		const dateObj = new Date(event.date);
		const key = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
		if (!acc[key]) acc[key] = [];
		acc[key].push(event);
		return acc;
	}, {} as Record<string, TimelineEvent[]>);

	const orderedGroupKeys = Array.from(new Set(events.map(e => {
		const dateObj = new Date(e.date);
		return dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });
	})));

	return (
		<Section title="Investigation Timeline">
			<div className="max-w-4xl mx-auto p-4 animate-fade-in min-h-[50vh]">
				{loading ? (
					<div className="flex justify-center items-center py-20 text-gray-400">Loading timeline...</div>
				) : error ? (
					<div className="text-red-500 font-medium py-10 text-center">{error}</div>
				) : !events.length ? (
					<div className="text-gray-500 text-center py-20">No events found in timeline. Upload documents to generate history.</div>
				) : (
					<div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">

						{orderedGroupKeys.map(group => (
							<div key={group} className="relative">
								<div className="sticky top-20 z-20 mb-4 ml-12 md:ml-0 md:text-center">
									<span className="inline-block px-3 py-1 text-sm font-semibold text-slate-900 bg-slate-100 rounded-full border border-slate-200 shadow-sm dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
										{group}
									</span>
								</div>

								{groupedEvents[group].map((event) => (
									<div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-8">

										{/* Icon */}
										<div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-200 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 dark:bg-slate-800 dark:border-slate-700">
											{event.type === 'document_upload' ? <FileText className="w-5 h-5 text-blue-500" /> :
												event.type === 'deadline' ? <Clock className="w-5 h-5 text-red-500" /> :
													event.type === 'document_date' ? <Calendar className="w-5 h-5 text-green-500" /> :
														<AlertCircle className="w-5 h-5 text-gray-500" />}
										</div>

										{/* Card Replacement (Div) */}
										<div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 shadow-md hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 rounded-xl border-l-4 md:border-l border-t-0 border-r-0 border-b-0 md:group-odd:border-r-4 md:group-odd:border-l-0 ${event.type === 'deadline' ? 'border-red-500' : event.type === 'document_upload' ? 'border-blue-500' : 'border-green-500'}`}>
											<div className="flex justify-between items-start mb-1">
												<time className="font-mono text-xs text-slate-500">{event.date}</time>
												<Badge color={event.type === 'deadline' ? 'danger' : 'default'}>
													{event.type.replace('_', ' ')}
												</Badge>
											</div>
											<h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">{event.title}</h3>
											<p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{event.description}</p>
											{event.related_node_id && (
												<Link to={`/documents/${event.related_node_id}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
													View Document →
												</Link>
											)}
										</div>
									</div>
								))}
							</div>
						))}
					</div>
				)}
			</div>
		</Section>
	);
};

export default TimelinePage;
