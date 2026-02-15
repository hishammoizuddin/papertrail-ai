

import React, { useState, useEffect, useRef } from 'react';
import { chat, ChatResponse } from '../api/chat';
import { listDocuments, Document } from '../api/documents';
import { Section } from '../components/ui/Section';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';


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
			<div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-xl w-full max-w-3xl mx-auto animate-fade-in flex flex-col min-h-[70vh] relative">
				{/* Chat messages */}
				<div className="flex-1 flex flex-col gap-4 overflow-y-auto bg-white/60 rounded-xl p-2 sm:p-4 md:p-6 shadow-inner min-h-[400px] max-h-[60vh] transition-all">
					{messages.length === 0 && (
						<div className="text-gray-400 text-center">Start a conversation with PaperTrail AI...</div>
					)}
					{messages.map((msg, idx) => (
						<div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} w-full`}> 
							<div className={`flex items-end ${msg.sender === 'user' ? 'flex-row-reverse' : ''} w-full max-w-full`}>
								<div className={`max-w-[90vw] sm:max-w-[80%] md:max-w-[70%] px-4 py-3 rounded-2xl shadow-md text-base whitespace-pre-line transition-all break-words
									${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-md animate-fade-in-right ml-2' : 'bg-gray-100 text-blue-900 rounded-bl-md animate-fade-in-left mr-2'}`}
								>
									{msg.text}
									{msg.sender === 'ai' && msg.citations && msg.citations.length > 0 && (
										<div className="flex flex-wrap gap-2 mt-3">
											{msg.citations.map(c => (
												<span key={c.chunk_id} className="inline-flex items-center bg-blue-100 border border-blue-300 rounded px-2 py-1 text-xs text-blue-700 font-medium cursor-pointer hover:bg-blue-200 transition" title={`Page ${c.page}`}>
													<svg className="w-4 h-4 mr-1 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7v10M17 7v10M5 17h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
													{c.filename} (Page {c.page})
												</span>
											))}
										</div>
									)}
								</div>
								<div className="flex items-end">
									{msg.sender === 'user' ? (
										<img src="https://api.dicebear.com/7.x/personas/svg?seed=user" alt="User" className="w-8 h-8 rounded-full border-2 border-blue-400 shadow ml-2" />
									) : (
										<img src="https://api.dicebear.com/7.x/bottts/svg?seed=ai" alt="AI" className="w-8 h-8 rounded-full border-2 border-green-400 shadow mr-2" />
									)}
								</div>
							</div>
						</div>
					))}
					<div ref={chatEndRef} />
				</div>
				{/* Chat input at the bottom */}
				<form
					onSubmit={handleSend}
					className="flex flex-col sm:flex-row items-stretch gap-2 sm:gap-3 mt-4 sticky bottom-0 bg-gradient-to-t from-white/90 to-transparent pt-4 z-10 w-full px-2 sm:px-0"
				>
					<div className="flex flex-row w-full gap-0">
						<select
							className="block w-40 min-w-[120px] border border-blue-300 border-r-0 rounded-l-lg px-3 py-2 text-blue-900 bg-white focus:ring-2 focus:ring-blue-400 transition focus:z-10"
							value={selectedDoc}
							onChange={e => setSelectedDoc(e.target.value)}
							disabled={loading}
							style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
						>
							<option value="all">All Documents</option>
							{documents.map(doc => (
								<option key={doc.id} value={doc.id}>{doc.filename}</option>
							))}
						</select>
						<input
							className="flex-1 text-lg border border-blue-300 border-l-0 border-r-0 px-4 py-2 w-full focus:ring-2 focus:ring-blue-400 transition focus:z-10 outline-none bg-white"
							value={input}
							onChange={e => setInput(e.target.value)}
							placeholder="Ask a question about your documents..."
							disabled={loading}
							style={{ borderRadius: 0, minWidth: 0 }}
							type="text"
						/>
						<button
							type="submit"
							disabled={loading || !input.trim()}
							className="rounded-r-lg rounded-l-none px-6 py-2 text-lg w-28 sm:w-auto border border-blue-300 border-l-0 bg-blue-500 hover:bg-blue-600 text-white font-semibold transition focus:z-10"
							style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0, minWidth: '80px' }}
						>
							{loading ? 'Sending...' : 'Send'}
						</button>
					</div>
				</form>
				{error && <div className="text-red-500 mb-4 font-medium animate-shake absolute left-0 right-0 mx-auto text-center bottom-20">{error}</div>}
			</div>
		</Section>
	);
};

export default ChatPage;
