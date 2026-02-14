
import React, { useEffect, useState } from 'react';
import { listDocuments, uploadDocument, processDocument, Document } from '../api/documents';
import UploadDropzone from '../components/UploadDropzone';
import DocumentList from '../components/DocumentList';
import { Section } from '../components/ui/Section';
import Card from '../components/ui/Card';

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
				<div className="bg-white rounded-lg shadow p-8 max-w-4xl mx-auto">
					<UploadDropzone onUpload={handleUpload} uploading={uploading} />
					{error && <div className="text-red-500 my-4 font-medium">{error}</div>}
					{loading ? (
						<div className="my-6 text-gray-500 text-lg">Loading documents...</div>
					) : (
						<DocumentList documents={documents} onProcess={handleProcess} />
					)}
				</div>
			</Section>
		);
};

export default InboxPage;
