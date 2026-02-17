
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
			className={`relative group cursor-pointer transition-all duration-300 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-700
                ${dragActive || uploading ? 'border-[#0071E3] bg-blue-50/50 dark:bg-blue-900/10' : 'hover:border-[#0071E3]/50 hover:bg-gray-50 dark:hover:bg-gray-800'}
                ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
			onDragOver={e => { e.preventDefault(); setDragActive(true); }}
			onDragLeave={e => { e.preventDefault(); setDragActive(false); }}
			onDrop={handleDrop}
			onClick={() => inputRef.current?.click()}
		>
			<input
				type="file"
				accept=".pdf,.png,.jpg,.jpeg"
				ref={inputRef}
				style={{ display: 'none' }}
				onChange={handleChange}
				disabled={uploading}
			/>

			<div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${dragActive ? 'bg-blue-100 text-[#0071E3] scale-110' : 'bg-gray-100/80 text-gray-400 group-hover:bg-blue-50 group-hover:text-[#0071E3]'}`}>
				<svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
			</div>

			<div className="space-y-1">
				<p className="text-lg font-medium text-[#1D1D1F] dark:text-white">
					{uploading ? 'Uploading...' : 'Drop your documents here'}
				</p>
				<p className="text-sm text-gray-500">
					Support for PDF, PNG, JPG files
				</p>
			</div>
		</div>
	);
};

export default UploadDropzone;
