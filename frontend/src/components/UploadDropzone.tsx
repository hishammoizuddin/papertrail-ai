
import React, { useRef, useState } from 'react';

interface Props {
	onUpload: (file: File) => void;
	uploading: boolean;
}

const UploadDropzone: React.FC<Props> = ({ onUpload, uploading }) => {
	const [dragActive, setDragActive] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setDragActive(false);
		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			onUpload(e.dataTransfer.files[0]);
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files && e.target.files[0]) {
			onUpload(e.target.files[0]);
		}
	};

		return (
			<div
				className={`border-2 border-dashed rounded-lg p-8 text-center mb-6 transition-colors flex flex-col items-center justify-center gap-2 shadow-sm bg-white ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
				onDragOver={e => { e.preventDefault(); setDragActive(true); }}
				onDragLeave={e => { e.preventDefault(); setDragActive(false); }}
				onDrop={handleDrop}
				onClick={() => inputRef.current?.click()}
				style={{ cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.6 : 1 }}
			>
				<input
					type="file"
					accept=".pdf,.png,.jpg,.jpeg"
					ref={inputRef}
					style={{ display: 'none' }}
					onChange={handleChange}
					disabled={uploading}
				/>
				<svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="mx-auto text-blue-400 mb-2"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-8m0 8l-3-3m3 3l3-3m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
				<div className="text-lg font-medium text-gray-700">
					{uploading ? 'Uploading...' : 'Drag & drop or click to select a PDF, PNG, or JPG'}
				</div>
				<div className="text-xs text-gray-400">Max file size: 10MB</div>
			</div>
		);
};

export default UploadDropzone;
