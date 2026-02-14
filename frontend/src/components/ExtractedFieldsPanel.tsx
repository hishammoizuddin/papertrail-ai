
import React from 'react';

interface Props {
	data: any;
}


const ExtractedFieldsPanel: React.FC<Props> = ({ data }) => {
	if (!data) return <div className="text-gray-500">No extracted data.</div>;

	return (
		<div className="space-y-2">
			<div><b>Doc Type:</b> {data.doc_type || '-'}</div>
			<div><b>Issuer:</b> {data.issuer || '-'}</div>
			{data.people && data.people.length > 0 && (
				<div>
					<b>People:</b>
					<ul className="list-disc ml-6">
						{data.people.map((p: any, i: number) => (
							<li key={i}>{p.name}{p.role ? ` (${p.role})` : ''}</li>
						))}
					</ul>
				</div>
			)}
			{data.addresses && data.addresses.length > 0 && (
				<div>
					<b>Addresses:</b>
					<ul className="list-disc ml-6">
						{data.addresses.map((a: any, i: number) => (
							<li key={i}>{a.address}{a.label ? ` (${a.label})` : ''}</li>
						))}
					</ul>
				</div>
			)}
			{data.amounts && data.amounts.length > 0 && (
				<div>
					<b>Amounts:</b>
					<ul className="list-disc ml-6">
						{data.amounts.map((a: any, i: number) => (
							<li key={i}>{a.value} {a.currency || ''} {a.label ? `(${a.label})` : ''}</li>
						))}
					</ul>
				</div>
			)}
			{data.dates && data.dates.length > 0 && (
				<div>
					<b>Dates:</b>
					<ul className="list-disc ml-6">
						{data.dates.map((d: any, i: number) => (
							<li key={i}>{d.label}: {d.date}</li>
						))}
					</ul>
				</div>
			)}
			{data.deadlines && data.deadlines.length > 0 && (
				<div>
					<b>Deadlines:</b>
					<ul className="list-disc ml-6">
						{data.deadlines.map((d: any, i: number) => (
							<li key={i}>{d.action} - {d.due_date} ({d.severity})</li>
						))}
					</ul>
				</div>
			)}
			{data.summary_bullets && data.summary_bullets.length > 0 && (
				<div>
					<b>Summary:</b>
					<ul className="list-disc ml-6">
						{data.summary_bullets.map((s: string, i: number) => (
							<li key={i}>{s}</li>
						))}
					</ul>
				</div>
			)}
			{data.recommended_actions && data.recommended_actions.length > 0 && (
				<div>
					<b>Recommended Actions:</b>
					<ul className="list-disc ml-6">
						{data.recommended_actions.map((a: string, i: number) => (
							<li key={i}>{a}</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
};

export default ExtractedFieldsPanel;
