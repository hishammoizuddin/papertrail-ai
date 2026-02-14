
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
			className={`border-2 border-dashed rounded p-6 text-center mb-6 transition-colors ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
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
			<div className="text-gray-700">
				{uploading ? 'Uploading...' : 'Drag & drop PDF/PNG/JPG or click to select'}
			</div>
		</div>
	);
};

export default UploadDropzone;
