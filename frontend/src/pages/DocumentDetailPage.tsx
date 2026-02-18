
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getDocument, processDocument, getDocumentPdfUrl, Document } from '../api/documents';
import ExtractedFieldsPanel from '../components/ExtractedFieldsPanel';
import { Section } from '../components/ui/Section';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

import axios from 'axios';

const DocumentDetailPage: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const [doc, setDoc] = useState<Document | null>(null);
	const [loading, setLoading] = useState(true);
	const [processing, setProcessing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [pdfUrl, setPdfUrl] = useState<string | null>(null);
	const [pdfError, setPdfError] = useState<string | null>(null);

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

	useEffect(() => {
		const fetchPdf = async () => {
			if (!id) return;
			try {
				const response = await axios.get(`/api/documents/${id}/pdf`, {
					responseType: 'blob'
				});
				const url = URL.createObjectURL(response.data);
				setPdfUrl(url);
			} catch (e) {
				console.error("Failed to load PDF", e);
				setPdfError("Failed to load PDF preview.");
			}
		};
		fetchPdf();

		return () => {
			if (pdfUrl) URL.revokeObjectURL(pdfUrl);
		};
	}, [id]);

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

	if (loading) return <div className="flex justify-center items-center h-64 text-gray-400">Loading document...</div>;
	if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
	if (!doc) return <div className="p-8 text-center text-gray-500">Document not found.</div>;

	return (
		<Section title={doc.filename}>
			<div className="flex flex-col gap-8 animate-fade-in">
				{/* Document meta summary */}
				<Card className="flex flex-col md:flex-row gap-8 items-start p-8">
					<div className="flex-1 flex flex-col gap-4 min-w-[280px]">
						<div>
							<h1 className="text-3xl font-bold text-[#1D1D1F] dark:text-white tracking-tight mb-3">{doc.filename}</h1>
							<div className="flex flex-wrap gap-2">
								<Badge color="primary">Type: {doc.doc_type || 'Unknown'}</Badge>
								<Badge color={doc.status === 'extracted' ? 'success' : 'warning'}>Status: {doc.status}</Badge>
								{doc.primary_due_date && <Badge color="danger">Due: {doc.primary_due_date}</Badge>}
							</div>
						</div>

						<div className="space-y-1 py-2">
							<div className="text-sm text-gray-500 dark:text-gray-400">Issuer</div>
							<div className="text-base font-medium text-gray-900 dark:text-gray-100">{doc.issuer || 'Not detected'}</div>
						</div>

						{doc.error_message && (
							<div className="p-3 bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-200 rounded-lg text-sm border border-red-100 dark:border-red-800">
								<strong>Error:</strong> {doc.error_message}
							</div>
						)}

						<div className="pt-2">
							<Button onClick={handleReextract} disabled={processing} variant="secondary">
								{processing ? 'Processing...' : 'Re-process Document'}
							</Button>
						</div>
					</div>

					{/* Detailed Summary */}
					{doc.extracted_json && (() => {
						const data = typeof doc.extracted_json === 'string' ? JSON.parse(doc.extracted_json) : doc.extracted_json;
						if (data.detailed_summary) {
							return (
								<div className="flex-1 bg-gray-50/80 dark:bg-gray-700/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-600">
									<h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Summary</h3>
									<p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">{data.detailed_summary}</p>
								</div>
							);
						}
						return null;
					})()}
				</Card>

				{/* Extracted fields and PDF preview */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<Card>
						<h2 className="text-xl font-semibold mb-6 text-[#1D1D1F] dark:text-white">Extracted Data</h2>
						<ExtractedFieldsPanel data={typeof doc.extracted_json === 'string' ? JSON.parse(doc.extracted_json) : doc.extracted_json} />
					</Card>

					<Card className="flex flex-col h-full min-h-[500px]">
						<h2 className="text-xl font-semibold mb-6 text-[#1D1D1F] dark:text-white">Document Preview</h2>
						{pdfUrl ? (
							<iframe
								src={pdfUrl}
								title="PDF Preview"
								className="w-full flex-grow rounded-xl border border-gray-200 bg-gray-50"
							/>
						) : (
							<div className="flex items-center justify-center h-full text-gray-400">
								{pdfError ? pdfError : 'Loading PDF...'}
							</div>
						)}
					</Card>
				</div>
			</div>
		</Section>
	);
};

export default DocumentDetailPage;
