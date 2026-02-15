
import React, { useEffect, useState } from 'react';
import { listDocuments, uploadDocument, processDocument, Document } from '../api/documents';

import UploadDropzone from '../components/UploadDropzone';
import { Section } from '../components/ui/Section';
import { Badge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/ui/Card';


const statusBadge = (status: string) => {
	switch (status) {
		case 'extracted': return <Badge color="success">Extracted</Badge>;
		case 'error': return <Badge color="danger">Error</Badge>;
		case 'indexed': return <Badge color="primary">Indexed</Badge>;
		case 'processing': return <Badge color="warning">Processing</Badge>;
		default: return <Badge color="default">{status}</Badge>;
	}
};

const InboxPage: React.FC = () => {
	const [documents, setDocuments] = useState<Document[]>([]);
	const [loading, setLoading] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const fetchDocs = async () => {
		setLoading(true);
		try {
			const docs = await listDocuments();
			setDocuments(docs);
		} catch (e: any) {
			setError(e.message || 'Failed to load documents');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchDocs();
	}, []);

	const handleUpload = async (file: File) => {
		setUploading(true);
		setError(null);
		try {
			const doc = await uploadDocument(file);
			setDocuments((prev) => [doc, ...prev]);
		} catch (e: any) {
			setError(e.message || 'Upload failed');
		} finally {
			setUploading(false);
		}
	};

	const handleProcess = async (docId: string) => {
		setError(null);
		try {
			await processDocument(docId);
			fetchDocs();
		} catch (e: any) {
			setError(e.message || 'Processing failed');
		}
	};

	return (
		<Section title="Inbox">
			<div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
				<UploadDropzone onUpload={handleUpload} uploading={uploading} />

				{error && <div className="text-red-500 my-4 font-medium animate-shake text-center">{error}</div>}

				{loading ? (
					<div className="flex justify-center my-12 text-gray-400 font-medium animate-pulse">Loading documents...</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<AnimatePresence>
							{documents.map((doc, idx) => (
								<motion.div
									key={doc.id}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 20 }}
									transition={{ delay: idx * 0.05, duration: 0.3 }}
								>
									<Card className="h-full flex flex-col justify-between group hover:ring-2 hover:ring-[#0071E3]/20 transition-all p-5">
										<Link to={`/documents/${doc.id}`} className="block space-y-3">
											<div className="flex items-start justify-between">
												<div className="p-2 bg-blue-50 text-[#0071E3] rounded-lg">
													<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
												</div>
												{statusBadge(doc.status)}
											</div>
											<div>
												<h3 className="font-semibold text-gray-900 truncate pr-2" title={doc.filename}>{doc.filename}</h3>
												<p className="text-xs text-gray-500 mt-1">{new Date(doc.created_at).toLocaleDateString()} • {doc.doc_type || 'Unknown'}</p>
											</div>
										</Link>

										<div className="mt-5 pt-4 border-t border-gray-100">
											<Button
												variant="secondary"
												className="w-full text-xs py-2 bg-gray-50 hover:bg-gray-100 border-0"
												onClick={() => handleProcess(doc.id)}
												disabled={doc.status === 'processing'}
											>
												{doc.status === 'extracted' ? 'Re-process' : doc.status === 'processing' ? 'Processing...' : 'Process Document'}
											</Button>
										</div>
									</Card>
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				)}
				{!loading && documents.length === 0 && (
					<div className="text-center py-12">
						<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
							<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
						</div>
						<h3 className="text-gray-900 font-medium text-lg">No documents yet</h3>
						<p className="text-gray-500">Upload a PDF to get started with PaperTrail AI.</p>
					</div>
				)}
			</div>
		</Section>
	);
};

export default InboxPage;
