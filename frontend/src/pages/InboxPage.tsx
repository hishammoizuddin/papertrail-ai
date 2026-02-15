
import React, { useEffect, useState } from 'react';
import { listDocuments, uploadDocument, processDocument, Document } from '../api/documents';

import UploadDropzone from '../components/UploadDropzone';
import { Section } from '../components/ui/Section';
import { Badge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';


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
			<div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-xl p-10 max-w-6xl mx-auto animate-fade-in">
				<UploadDropzone onUpload={handleUpload} uploading={uploading} />
				{error && <div className="text-red-500 my-4 font-medium animate-shake">{error}</div>}
				{loading ? (
					<div className="my-6 text-gray-500 text-lg animate-pulse">Loading documents...</div>
				) : (
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-8">
						<AnimatePresence>
							{documents.map((doc, idx) => (
								<motion.div
									key={doc.id}
									initial={{ opacity: 0, y: 30 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: 30 }}
									transition={{ delay: idx * 0.05, duration: 0.4, type: 'spring' }}
									whileHover={{ scale: 1.03, boxShadow: '0 8px 32px 0 rgba(0,0,0,0.12)' }}
									className="bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4 cursor-pointer border-2 border-transparent hover:border-blue-400 transition-all group"
								>
									<Link to={`/documents/${doc.id}`} className="flex-1 flex flex-col gap-2">
										<div className="flex items-center gap-2">
											<svg className="w-6 h-6 text-blue-500 group-hover:animate-bounce" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7v10M17 7v10M5 17h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
											<span className="text-lg font-bold text-blue-900 truncate">{doc.filename}</span>
										</div>
										<div className="flex gap-2 items-center mt-1">
											{statusBadge(doc.status)}
											<span className="text-xs text-gray-500">{doc.doc_type || '-'}</span>
										</div>
										<div className="text-xs text-gray-400 mt-2">Uploaded: {new Date(doc.created_at).toLocaleString()}</div>
									</Link>
									<div className="flex gap-2 mt-2">
										<Button
											className="flex-1 py-1 text-sm bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white shadow"
											onClick={() => handleProcess(doc.id)}
											disabled={doc.status === 'processing'}
										>
											{doc.status === 'extracted' ? 'Re-extract' : doc.status === 'processing' ? 'Processing...' : 'Process'}
										</Button>
									</div>
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				)}
				{!loading && documents.length === 0 && (
					<div className="text-gray-400 text-center mt-10 text-lg animate-fade-in">No documents uploaded yet.</div>
				)}
			</div>
		</Section>
	);
};

export default InboxPage;
