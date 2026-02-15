

import React, { useState, useEffect, useRef } from 'react';
import { chat, ChatResponse } from '../api/chat';
import { listDocuments, Document } from '../api/documents';
import { Section } from '../components/ui/Section';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input'; // Fixed import to default
import Card from '../components/ui/Card';

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

const ChatPage: React.FC = () => {
	const [input, setInput] = useState('');
	const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string; citations?: ChatResponse['citations'] }[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [documents, setDocuments] = useState<Document[]>([]);
	const [selectedDoc, setSelectedDoc] = useState<string>('all');
	const chatEndRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		listDocuments().then(setDocuments);
	}, []);

	useEffect(() => {
		chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages]);

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim()) return;
		setLoading(true);
		setError(null);
		setMessages((prev) => [...prev, { sender: 'user', text: input }]);
		try {
			const res = await chat(input, selectedDoc === 'all' ? undefined : selectedDoc);
			setMessages((prev) => [...prev, { sender: 'ai', text: extractAnswerText(res.answer), citations: res.citations }]);
		} catch (e: any) {
			setError(e.message || 'Chat failed');
		} finally {
			setLoading(false);
			setInput('');
		}
	};

	return (
		<Section title="AI Chat Assistant">
			<Card className="w-full max-w-4xl mx-auto flex flex-col h-[75vh] p-0 overflow-hidden relative border-0 shadow-xl ring-1 ring-black/5">
				{/* Chat messages */}
				<div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white">
					{messages.length === 0 && (
						<div className="flex flex-col items-center justify-center h-full text-center space-y-4">
							<div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
								<svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
							</div>
							<p className="text-gray-500 font-medium">Start a conversation with PaperTrail AI...</p>
						</div>
					)}
					{messages.map((msg, idx) => (
						<div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
							<div className={`flex items-end gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
								<div className={`
                                    px-5 py-3.5 rounded-[20px] text-[15px] leading-relaxed shadow-sm
                                    ${msg.sender === 'user'
										? 'bg-[#0071E3] text-white rounded-br-none'
										: 'bg-[#F2F2F7] text-[#1D1D1F] rounded-bl-none'}
                                `}>
									{msg.text}
									{msg.sender === 'ai' && msg.citations && msg.citations.length > 0 && (
										<div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-200/50">
											{msg.citations.map(c => (
												<span key={c.chunk_id} className="inline-flex items-center bg-white/50 border border-black/5 rounded-md px-2 py-1 text-xs text-gray-600 font-medium cursor-pointer hover:bg-white transition" title={`Page ${c.page}`}>
													<svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7v10M17 7v10M5 17h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
													{c.filename} (Pg {c.page})
												</span>
											))}
										</div>
									)}
								</div>
							</div>
						</div>
					))}
					<div ref={chatEndRef} />
				</div>

				{/* Input Area */}
				<div className="p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 absolute bottom-0 left-0 right-0">
					<form onSubmit={handleSend} className="max-w-4xl mx-auto relative flex items-center gap-3">
						<div className="relative">
							<select
								className="appearance-none bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium py-2 pl-3 pr-8 rounded-lg cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
								value={selectedDoc}
								onChange={e => setSelectedDoc(e.target.value)}
								disabled={loading}
							>
								<option value="all">All Docs</option>
								{documents.map(doc => (
									<option key={doc.id} value={doc.id}>{doc.filename}</option>
								))}
							</select>
							<div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
								<svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
							</div>
						</div>

						<div className="flex-1 relative">
							<input
								className="w-full bg-gray-100 text-gray-900 placeholder-gray-500 rounded-full px-5 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[#0071E3] focus:bg-white transition-all shadow-inner"
								value={input}
								onChange={e => setInput(e.target.value)}
								placeholder="Message PaperTrail..."
								disabled={loading}
							/>
							<button
								type="submit"
								disabled={loading || !input.trim()}
								className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-full disabled:opacity-50 disabled:bg-gray-300 transition-all active:scale-95"
							>
								<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
							</button>
						</div>
					</form>
				</div>

				{error && (
					<div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-red-100 text-red-600 px-4 py-2 rounded-full text-sm font-medium shadow-sm animate-fade-in border border-red-200">
						{error}
					</div>
				)}
			</Card>
		</Section>
	);
};

export default ChatPage;
