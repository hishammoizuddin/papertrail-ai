
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDocument, processDocument, getDocumentPdfUrl, Document } from '../api/documents';
import ExtractedFieldsPanel from '../components/ExtractedFieldsPanel';

const DocumentDetailPage: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const [doc, setDoc] = useState<Document | null>(null);
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchDoc = async () => {
		if (!id) return;
		setLoading(true);
		setError(null);
		try {
			const d = await getDocument(id);
			setDoc(d);
		} catch (e: any) {
			setError(e.message || 'Failed to load document');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => { fetchDoc(); }, [id]);

	const handleReextract = async () => {
		if (!id) return;
		setProcessing(true);
		setError(null);
		try {
			await processDocument(id);
			fetchDoc();
		} catch (e: any) {
			setError(e.message || 'Re-extract failed');
		} finally {
			setProcessing(false);
		}
	};

	if (loading) return <div className="p-8">Loading document...</div>;
	if (error) return <div className="p-8 text-red-500">{error}</div>;
	if (!doc) return <div className="p-8">Document not found.</div>;

	return (
		<div className="max-w-4xl mx-auto py-8">
			<h1 className="text-2xl font-bold mb-4">{doc.filename}</h1>
			<div className="mb-4 flex gap-4">
				<button
					className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
					onClick={handleReextract}
					disabled={processing}
				>
					{processing ? 'Re-extracting...' : 'Re-extract'}
				</button>
				<span className="text-gray-600">Status: {doc.status}</span>
				{doc.error_message && <span className="text-red-500">Error: {doc.error_message}</span>}
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div>
					<h2 className="font-semibold mb-2">Extracted Fields</h2>
					  <ExtractedFieldsPanel data={typeof doc.extracted_json === 'string' ? JSON.parse(doc.extracted_json) : doc.extracted_json} />
				</div>
				<div>
					<h2 className="font-semibold mb-2">PDF Preview</h2>
					<iframe
						src={getDocumentPdfUrl(doc.id)}
						title="PDF Preview"
						className="w-full h-96 border"
					/>
				</div>
			</div>
		</div>
	);
};

export default DocumentDetailPage;
