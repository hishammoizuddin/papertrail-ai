
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
				<div className="flex flex-col gap-8">
					{/* Document meta summary */}
					<div className="flex flex-col md:flex-row gap-6 items-start bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-xl p-8">
						<div className="flex-1 flex flex-col gap-2 min-w-[220px]">
							<div className="text-2xl font-bold text-blue-900 mb-2">{doc.filename}</div>
							<div className="flex flex-wrap gap-3 mb-2">
								<span className="inline-block bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">Type: {doc.doc_type || '-'}</span>
								<span className="inline-block bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">Status: {doc.status}</span>
								{doc.primary_due_date && <span className="inline-block bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">Due: {doc.primary_due_date}</span>}
							</div>
							<div className="text-md text-gray-700 mb-1"><span className="font-semibold text-blue-900">Issuer:</span> {doc.issuer || '-'}</div>
							{doc.error_message && <div className="text-red-500 font-medium">Error: {doc.error_message}</div>}
							<Button onClick={handleReextract} disabled={processing} className="mt-2 w-40">
								{processing ? 'Re-extracting...' : 'Re-extract'}
							</Button>
						</div>
						{/* Beautiful summary card if available */}
						{doc.extracted_json && (() => {
							const data = typeof doc.extracted_json === 'string' ? JSON.parse(doc.extracted_json) : doc.extracted_json;
							if (data.detailed_summary) {
								return (
									<div className="flex-1 bg-white rounded-xl shadow-lg p-6 border border-blue-100 min-w-[260px] max-w-xl animate-fade-in">
										<div className="text-lg font-bold text-blue-900 mb-2">Document Summary</div>
										<div className="text-gray-800 whitespace-pre-line leading-relaxed">{data.detailed_summary}</div>
									</div>
								);
							}
							return null;
						})()}
					</div>
					{/* Extracted fields and PDF preview */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
						<div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100 animate-fade-in">
							<h2 className="font-semibold mb-2 text-lg text-blue-900">Extracted Fields</h2>
							<ExtractedFieldsPanel data={typeof doc.extracted_json === 'string' ? JSON.parse(doc.extracted_json) : doc.extracted_json} />
						</div>
						<div className="bg-white rounded-2xl shadow-lg p-6 border border-blue-100 animate-fade-in flex flex-col">
							<h2 className="font-semibold mb-2 text-lg text-blue-900">PDF Preview</h2>
							<iframe
								src={getDocumentPdfUrl(doc.id)}
								title="PDF Preview"
								className="w-full h-96 border rounded-lg shadow-sm bg-white"
								style={{ minHeight: 350 }}
							/>
						</div>
					</div>
				</div>
			</Section>
		);
};

export default DocumentDetailPage;
