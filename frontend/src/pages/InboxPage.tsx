
import React, { useEffect, useState } from 'react';
import { listDocuments, uploadDocument, processDocument, deleteDocument, Document } from '../api/documents';

import UploadDropzone from '../components/UploadDropzone';
import { Section } from '../components/ui/Section';
import { Badge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Card from '../components/ui/Card';
import ActionCenter from '../components/ActionCenter';


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

	// Poll for updates if any document is processing
	useEffect(() => {
		if (documents.some(d => d.status === 'processing')) {
			const interval = setInterval(() => {
				fetchDocs();
			}, 2000);
			return () => clearInterval(interval);
		}
	}, [documents]);

	const handleProcess = async (docId: string, isAuto = false) => {
		setError(null);

		// Optimistic update: set status to processing immediately
		setDocuments(prev => prev.map(d =>
			d.id === docId ? { ...d, status: 'processing' } : d
		));

		try {
			await processDocument(docId);
			// Refresh documents to get the latest status
			fetchDocs();
		} catch (e: any) {
			setError(e.message || 'Processing failed');
			// Revert status on error (optional, but good practice, or just let fetchDocs fix it)
			fetchDocs();
		}
	};

	const handleDelete = async (docId: string, event: React.MouseEvent) => {
		event.preventDefault(); // Prevent link navigation
		event.stopPropagation();

		if (!window.confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
			return;
		}

		try {
			// Optimistic update
			setDocuments(prev => prev.filter(d => d.id !== docId));
			await deleteDocument(docId);
		} catch (e: any) {
			setError(e.message || 'Delete failed');
			fetchDocs(); // Revert on failure
		}
	};

	const handleUpload = async (file: File) => {
		setUploading(true);
		setError(null);
		try {
			const doc = await uploadDocument(file);
			setDocuments((prev) => [doc, ...prev]);

			// Auto-process immediately
			await handleProcess(doc.id, true);
		} catch (e: any) {
			setError(e.message || 'Upload failed');
		} finally {
			setUploading(false);
		}
	};

	return (
		<Section title="Dashboard">
			<div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
				{/* Dashboard Widget Area */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2">
						<UploadDropzone onUpload={handleUpload} uploading={uploading} />
					</div>
					<div className="lg:col-span-1">
						<ActionCenter />
					</div>
				</div>

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
									<Card className="h-full flex flex-col justify-between group hover:ring-2 hover:ring-[#0071E3]/20 transition-all p-5 dark:bg-gray-800 dark:border-gray-700 relative">
										<Link to={`/documents/${doc.id}`} className="block space-y-3">
											<div className="flex items-start justify-between">
												<div className="p-2 bg-blue-50 text-[#0071E3] rounded-lg dark:bg-blue-900/30 dark:text-blue-400">
													<svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
												</div>
												<div className="flex items-center gap-2">
													{statusBadge(doc.status)}
													<button
														onClick={(e) => handleDelete(doc.id, e)}
														className="text-gray-400 hover:text-red-500 transition-colors p-1"
														title="Delete document"
													>
														<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
													</button>
												</div>
											</div>
											<div>
												<h3 className="font-semibold text-gray-900 truncate pr-2 dark:text-white" title={doc.filename}>{doc.filename}</h3>
												<p className="text-xs text-gray-500 mt-1 dark:text-gray-400">{new Date(doc.created_at).toLocaleDateString()} • {doc.doc_type || 'Unknown'}</p>
											</div>
										</Link>

										<div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
											<div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
												{doc.status === 'processing' ? (
													<div className="w-full py-2 flex items-center justify-center gap-2 text-blue-600 bg-blue-50/50 rounded-lg dark:bg-blue-900/20 dark:text-blue-400">
														<div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
														<span className="text-xs font-medium">Processing...</span>
													</div>
												) : (
													<Button
														variant="secondary"
														className="w-full text-xs py-2 bg-gray-50 hover:bg-gray-100 border-0 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
														onClick={() => handleProcess(doc.id)}
													>
														{doc.status === 'extracted' ? 'Re-process' : 'Process Document'}
													</Button>
												)}
											</div>
										</div>
									</Card>
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				)}
				{!loading && documents.length === 0 && (
					<div className="text-center py-12">
						<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400 dark:bg-gray-800 dark:text-gray-500">
							<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
						</div>
						<h3 className="text-gray-900 font-medium text-lg dark:text-white">No documents yet</h3>
						<p className="text-gray-500 dark:text-gray-400">Upload a document to get started with PaperTrail AI.</p>
					</div>
				)}
			</div>
		</Section>
	);
};

export default InboxPage;
