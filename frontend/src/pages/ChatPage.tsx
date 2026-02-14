
import React, { useState } from 'react';
import { chat, ChatResponse } from '../api/chat';

const ChatPage: React.FC = () => {
	const [input, setInput] = useState('');
	const [response, setResponse] = useState<ChatResponse | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSend = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError(null);
		setResponse(null);
		try {
			const res = await chat(input);
			setResponse(res);
		} catch (e: any) {
			setError(e.message || 'Chat failed');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="max-w-2xl mx-auto py-8">
			<h1 className="text-2xl font-bold mb-4">Chat Across All Docs</h1>
			<form onSubmit={handleSend} className="flex gap-2 mb-4">
				<input
					className="flex-1 border rounded px-3 py-2"
					value={input}
					onChange={e => setInput(e.target.value)}
					placeholder="Ask a question..."
					disabled={loading}
				/>
				<button
					className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
					type="submit"
					disabled={loading || !input.trim()}
				>
					{loading ? 'Sending...' : 'Send'}
				</button>
			</form>
			{error && <div className="text-red-500 mb-2">{error}</div>}
			{response && (
				<div className="bg-gray-100 p-4 rounded">
					<div className="mb-2 whitespace-pre-line">{response.answer}</div>
					<div className="flex flex-wrap gap-2 mt-2">
						{response.citations.map(c => (
							<span key={c.chunk_id} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
								{c.filename} (p{c.page}, chunk {c.chunk_id.split(':').pop()})
							</span>
						))}
					</div>
				</div>
			)}
		</div>
	);
};

export default ChatPage;
