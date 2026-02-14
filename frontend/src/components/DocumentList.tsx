

import React from 'react';
import { Document } from '../api/documents';
import { Link } from 'react-router-dom';
import Button from './ui/Button';
import { Badge } from './ui/Badge';
import Card from './ui/Card';

interface Props {
	documents: Document[];
	onProcess: (docId: string) => void;
}

const statusBadge = (status: string) => {
	switch (status) {
		case 'extracted': return <Badge color="success">Extracted</Badge>;
		case 'error': return <Badge color="danger">Error</Badge>;
		case 'indexed': return <Badge color="primary">Indexed</Badge>;
		default: return <Badge color="default">{status}</Badge>;
	}
};

const DocumentList: React.FC<Props> = ({ documents, onProcess }) => {
	if (!documents.length) return <div className="text-gray-500">No documents uploaded yet.</div>;
	return (
		<div className="overflow-x-auto mt-4">
			<table className="w-full min-w-[600px] border-separate border-spacing-y-2">
				<thead>
					<tr className="bg-gray-50">
						<th className="p-3 text-left font-semibold text-gray-700">Filename</th>
						<th className="p-3 text-left font-semibold text-gray-700">Type</th>
						<th className="p-3 text-left font-semibold text-gray-700">Status</th>
						<th className="p-3 text-left font-semibold text-gray-700">Actions</th>
					</tr>
				</thead>
				<tbody>
					{documents.map(doc => (
						<tr key={doc.id} className="bg-white shadow-sm rounded-lg">
							<td className="p-3">
								<Link
									to={`/documents/${doc.id}`}
									className="text-blue-700 font-medium hover:underline"
								>
									{doc.filename}
								</Link>
							</td>
							<td className="p-3">{doc.doc_type || '-'}</td>
							<td className="p-3">{statusBadge(doc.status)}</td>
							<td className="p-3">
								<Button
									className="px-4 py-1 text-sm"
									onClick={() => onProcess(doc.id)}
									disabled={doc.status === 'processing'}
								>
									{doc.status === 'extracted' ? 'Re-extract' : doc.status === 'processing' ? 'Processing...' : 'Process'}
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

export default DocumentList;
