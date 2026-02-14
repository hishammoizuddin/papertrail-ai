

import React from 'react';
import { Document } from '../api/documents';
import { Link } from 'react-router-dom';

interface Props {
	documents: Document[];
	onProcess: (docId: string) => void;
}

const statusColor = (status: string) => {
	switch (status) {
		case 'extracted': return 'text-green-600';
		case 'error': return 'text-red-600';
		case 'indexed': return 'text-blue-600';
		default: return 'text-gray-600';
	}
};

const DocumentList: React.FC<Props> = ({ documents, onProcess }) => {
	if (!documents.length) return <div className="text-gray-500">No documents uploaded yet.</div>;
	return (
		<table className="w-full border mt-4 bg-white">
			<thead>
				<tr className="bg-gray-100">
					<th className="p-2 text-left">Filename</th>
					<th className="p-2 text-left">Type</th>
					<th className="p-2 text-left">Status</th>
					<th className="p-2 text-left">Actions</th>
				</tr>
			</thead>
			<tbody>
				{documents.map(doc => (
					<tr key={doc.id} className="border-t">
						<td className="p-2">
							<Link
								to={`/documents/${doc.id}`}
								className="text-blue-600 hover:underline cursor-pointer"
							>
								{doc.filename}
							</Link>
						</td>
						<td className="p-2">{doc.doc_type || '-'}</td>
						<td className={`p-2 ${statusColor(doc.status)}`}>{doc.status}</td>
						<td className="p-2">
							<button
								className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
								onClick={() => onProcess(doc.id)}
								disabled={doc.status === 'extracted'}
							>
								{doc.status === 'extracted' ? 'Processed' : 'Process'}
							</button>
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
};

export default DocumentList;
