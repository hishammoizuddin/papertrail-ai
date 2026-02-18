

import React from 'react';
import { Badge } from './ui/Badge';

interface Props {
	data: any;
}

const SectionBlock: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
	<div className="mb-4">
		<div className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-1">{title}</div>
		<div>{children}</div>
	</div>
);

const ExtractedFieldsPanel: React.FC<Props> = ({ data }) => {
	if (!data) return <div className="text-gray-400 italic">No extracted data.</div>;

	return (
		<div className="space-y-2 text-gray-900 dark:text-gray-200">
			<SectionBlock title="Document Type">
				<Badge color="primary">{data.doc_type || '-'}</Badge>
			</SectionBlock>
			<SectionBlock title="Issuer">
				{data.issuer || <span className="text-gray-400">-</span>}
			</SectionBlock>
			{data.people && data.people.length > 0 && (
				<SectionBlock title="People">
					<ul className="list-disc ml-6">
						{data.people.map((p: any, i: number) => (
							<li key={i}>{p.name}{p.role ? <span className="text-gray-400"> ({p.role})</span> : ''}</li>
						))}
					</ul>
				</SectionBlock>
			)}
			{data.addresses && data.addresses.length > 0 && (
				<SectionBlock title="Addresses">
					<ul className="list-disc ml-6">
						{data.addresses.map((a: any, i: number) => (
							<li key={i}>{a.address}{a.label ? <span className="text-gray-400"> ({a.label})</span> : ''}</li>
						))}
					</ul>
				</SectionBlock>
			)}
			{data.amounts && data.amounts.length > 0 && (
				<SectionBlock title="Amounts">
					<ul className="list-disc ml-6">
						{data.amounts.map((a: any, i: number) => (
							<li key={i}>{a.value} {a.currency || ''} {a.label ? <span className="text-gray-400">({a.label})</span> : ''}</li>
						))}
					</ul>
				</SectionBlock>
			)}
			{data.dates && data.dates.length > 0 && (
				<SectionBlock title="Dates">
					<ul className="list-disc ml-6">
						{data.dates.map((d: any, i: number) => (
							<li key={i}>{d.label}: {d.date}</li>
						))}
					</ul>
				</SectionBlock>
			)}
			{data.deadlines && data.deadlines.length > 0 && (
				<SectionBlock title="Deadlines">
					<ul className="list-disc ml-6">
						{data.deadlines.map((d: any, i: number) => (
							<li key={i}>{d.action} - {d.due_date} <Badge color={d.severity === 'high' ? 'danger' : d.severity === 'medium' ? 'warning' : 'success'}>{d.severity}</Badge></li>
						))}
					</ul>
				</SectionBlock>
			)}
			{data.summary_bullets && data.summary_bullets.length > 0 && (
				<SectionBlock title="Summary">
					<ul className="list-disc ml-6">
						{data.summary_bullets.map((s: string, i: number) => (
							<li key={i}>{s}</li>
						))}
					</ul>
				</SectionBlock>
			)}
			{data.recommended_actions && data.recommended_actions.length > 0 && (
				<SectionBlock title="Recommended Actions">
					<ul className="list-disc ml-6">
						{data.recommended_actions.map((a: string, i: number) => (
							<li key={i}>{a}</li>
						))}
					</ul>
				</SectionBlock>
			)}
		</div>
	);
};

export default ExtractedFieldsPanel;
