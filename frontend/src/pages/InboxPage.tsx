
import React, { useEffect, useState } from 'react';
import { listDocuments, uploadDocument, processDocument, Document } from '../api/documents';
import UploadDropzone from '../components/UploadDropzone';
import DocumentList from '../components/DocumentList';

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
		<div className="max-w-3xl mx-auto py-8">
			<h1 className="text-2xl font-bold mb-4">Inbox</h1>
			<UploadDropzone onUpload={handleUpload} uploading={uploading} />
			{error && <div className="text-red-500 my-2">{error}</div>}
			{loading ? (
				<div className="my-4">Loading documents...</div>
			) : (
				<DocumentList documents={documents} onProcess={handleProcess} />
			)}
		</div>
	);
};

export default InboxPage;
