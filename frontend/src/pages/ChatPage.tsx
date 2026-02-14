
import React, { useState } from 'react';
import { chat, ChatResponse } from '../api/chat';
import { Section } from '../components/ui/Section';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

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
			<Section title="Chat Across All Docs">
				<Card>
					<form onSubmit={handleSend} className="flex gap-2 mb-4 items-end">
						<Input
							className="flex-1"
							value={input}
							onChange={e => setInput(e.target.value)}
							placeholder="Ask a question..."
							disabled={loading}
						/>
						<Button type="submit" disabled={loading || !input.trim()}>
							{loading ? 'Sending...' : 'Send'}
						</Button>
					</form>
					{error && <div className="text-red-500 mb-2 font-medium">{error}</div>}
					{response && (
						<div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
							<div className="mb-2 whitespace-pre-line text-gray-800 text-base">{response.answer}</div>
							<div className="flex flex-wrap gap-2 mt-2">
								{response.citations.map(c => (
									<span key={c.chunk_id} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
										{c.filename} (p{c.page}, chunk {c.chunk_id.split(':').pop()})
									</span>
								))}
							</div>
						</div>
					)}
				</Card>
			</Section>
		);
};

export default ChatPage;
