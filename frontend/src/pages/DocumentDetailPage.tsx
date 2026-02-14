
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDocument, processDocument, getDocumentPdfUrl, Document } from '../api/documents';
import ExtractedFieldsPanel from '../components/ExtractedFieldsPanel';
import { Section } from '../components/ui/Section';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

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

	if (loading) return <div className="p-8 text-gray-500">Loading document...</div>;
	if (error) return <div className="p-8 text-red-500">{error}</div>;
	if (!doc) return <div className="p-8 text-gray-500">Document not found.</div>;

	return (
		<Section title={doc.filename}>
			<div className="mb-6 flex flex-wrap gap-6 items-center bg-white rounded-lg shadow p-6">
				<div className="flex flex-col gap-2">
					<span className="text-lg font-semibold text-blue-900">Type: <span className="font-normal text-gray-700">{doc.doc_type || '-'}</span></span>
					<span className="text-lg font-semibold text-blue-900">Issuer: <span className="font-normal text-gray-700">{doc.issuer || '-'}</span></span>
					<span className="text-lg font-semibold text-blue-900">Primary Due Date: <span className="font-normal text-gray-700">{doc.primary_due_date || '-'}</span></span>
					<span className="text-lg font-semibold text-blue-900">Status: <span className="font-normal text-green-700">{doc.status}</span></span>
					{doc.error_message && <span className="text-red-500 font-medium">Error: {doc.error_message}</span>}
				</div>
				<Button onClick={handleReextract} disabled={processing} className="mt-2">
					{processing ? 'Re-extracting...' : 'Re-extract'}
				</Button>
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				<Card>
					<h2 className="font-semibold mb-2 text-lg text-blue-900">Extracted Fields</h2>
					<ExtractedFieldsPanel data={typeof doc.extracted_json === 'string' ? JSON.parse(doc.extracted_json) : doc.extracted_json} />
				</Card>
				<Card>
					<h2 className="font-semibold mb-2 text-lg text-blue-900">PDF Preview</h2>
					<iframe
						src={getDocumentPdfUrl(doc.id)}
						title="PDF Preview"
						className="w-full h-96 border rounded-lg shadow-sm bg-white"
					/>
				</Card>
			</div>
		</Section>
	);
};

export default DocumentDetailPage;
