

import React, { useState, useEffect, useRef } from 'react';
import { chat, ChatResponse } from '../api/chat';
import { listDocuments, Document } from '../api/documents';
import { Section } from '../components/ui/Section';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input'; // Fixed import to default
import Card from '../components/ui/Card';
import axios from 'axios';

// Helper to extract only the answer text if the backend returns a JSON string
function extractAnswerText(answer: string): string {
	try {
		const parsed = JSON.parse(answer);
		if (typeof parsed === 'object' && parsed.response) return parsed.response;
		return answer;
	} catch {
		return answer;
	}
}

interface Message {
	role: 'user' | 'assistant';
	content: string;
	image?: string;
	citations?: ChatResponse['citations'];
}

const ChatPage: React.FC = () => {
	const [messages, setMessages] = useState<Message[]>([
		{ role: 'assistant', content: 'Hello! I can help you analyze documents or answer questions. I can also see images now!' }
	]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [selectedDoc, setSelectedDoc] = useState<string>('');
	const [documents, setDocuments] = useState<any[]>([]);
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const fetchDocs = async () => {
			try {
				const res = await axios.get('http://localhost:8000/api/documents/');
				setDocuments(res.data);
			} catch (e) {
				console.error(e);
			}
		};
		fetchDocs();
	}, []);

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const handleSend = async () => {
		if (!input.trim() && !imageUrl) return;

		const userMsg: Message = { role: 'user', content: input, image: imageUrl || undefined };
		setMessages(prev => [...prev, userMsg]);
		setInput('');
		const currentImage = imageUrl;
		setImageUrl(null); // Clear after sending
		setLoading(true);

		try {
			const res = await axios.post('http://localhost:8000/api/chat/', {
				message: userMsg.content,
				document_id: selectedDoc || undefined,
				image_url: currentImage || undefined
			});

			const botMsg: Message = {
				role: 'assistant',
				content: res.data.answer,
				citations: res.data.citations
			};
			setMessages(prev => [...prev, botMsg]);
		} catch (error) {
			console.error(error);
			setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error.' }]);
		} finally {
			setLoading(false);
		}
	};

	const handleImageUpload = () => {
		const url = prompt("Enter image URL for analysis (e.g. from public web):");
		if (url) {
			setImageUrl(url);
		}
	};

	return (
		<Section title="Chat Assistant" className="h-[calc(100vh-140px)] flex flex-col">
			<Card className="flex-grow flex flex-col p-0 overflow-hidden bg-white/50 backdrop-blur-xl border border-white/20 shadow-2xl">
				{/* Header / Toolbar */}
				<div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white/40">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">PT</div>
						<span className="font-semibold text-gray-700">PaperTrail v2.0</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs text-gray-500 font-medium">Context:</span>
						<select
							className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none shadow-sm"
							value={selectedDoc}
							onChange={(e) => setSelectedDoc(e.target.value)}
						>
							<option value="">All Documents (General Knowledge)</option>
							{documents.map(doc => (
								<option key={doc.id} value={doc.id}>{doc.filename}</option>
							))}
						</select>
					</div>
				</div>

				{/* Messages Area */}
				<div className="flex-grow overflow-y-auto p-6 space-y-6">
					{messages.map((msg, idx) => (
						<div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
							<div className={`flex flex-col max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
								<div className={`px-5 py-3 rounded-2xl shadow-sm text-sm leading-relaxed relative ${msg.role === 'user'
									? 'bg-[#0071E3] text-white rounded-br-none'
									: 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
									}`}>
									{msg.image && (
										<div className="mb-2">
											<img src={msg.image} alt="User upload" className="max-w-[200px] rounded-lg border border-white/20" />
										</div>
									)}
									{msg.content}
								</div>

								{/* Citations */}
								{msg.citations && msg.citations.length > 0 && (
									<div className="mt-2 flex flex-wrap gap-2">
										{msg.citations.map((cit, cIdx) => (
											<div key={cIdx} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded border border-gray-200">
												📄 {cit.filename} (p.{cit.page})
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					))}
					{loading && (
						<div className="flex justify-start">
							<div className="bg-white border border-gray-100 px-5 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
								<div className="flex space-x-1">
									<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
									<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
									<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
								</div>
								<span className="text-xs text-gray-400 font-medium ml-2">{imageUrl ? "Analyzing image..." : "Thinking..."}</span>
							</div>
						</div>
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Input Area */}
				<div className="p-4 bg-white border-t border-gray-100">
					<div className="flex items-end gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
						<button onClick={handleImageUpload} className={`p-2 rounded-lg text-gray-400 hover:text-[#0071E3] hover:bg-white transition-colors ${imageUrl ? 'text-[#0071E3] bg-blue-50' : ''}`} title="Upload Image URL">
							<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
						</button>
						<div className="flex-grow flex flex-col">
							{imageUrl && (
								<div className="text-xs text-blue-600 truncate max-w-[300px] mb-1 px-1 flex justify-between items-center">
									<span>Image attached</span>
									<button onClick={() => setImageUrl(null)} className="text-gray-400 hover:text-red-500">×</button>
								</div>
							)}
							<input
								type="text"
								className="w-full bg-transparent border-none focus:ring-0 p-2 text-gray-700 placeholder-gray-400 text-sm"
								placeholder="Ask a question or describe an image..."
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyPress={(e) => e.key === 'Enter' && handleSend()}
							/>
						</div>
						<Button
							className="rounded-lg px-4 py-2 h-auto"
							onClick={handleSend}
							disabled={!input.trim() && !imageUrl || loading}
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
						</Button>
					</div>
				</div>
			</Card>
		</Section>
	);
};

export default ChatPage;
