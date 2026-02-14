
import React, { useState } from 'react';
import { chat, ChatResponse } from '../api/chat';
import { Section } from '../components/ui/Section';
import Card from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import Button from '../components/ui/Button';

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
			<div className="bg-white rounded-lg shadow p-8 max-w-3xl mx-auto">
				<form onSubmit={handleSend} className="flex gap-4 mb-6 items-end">
					<Input
						className="flex-1 text-lg border border-gray-300 rounded-lg px-4 py-2"
						value={input}
						onChange={e => setInput(e.target.value)}
						placeholder="Ask a question about your documents..."
						disabled={loading}
					/>
					<Button type="submit" disabled={loading || !input.trim()} className="px-6 py-2 text-lg">
						{loading ? 'Sending...' : 'Send'}
					</Button>
				</form>
				{error && <div className="text-red-500 mb-4 font-medium">{error}</div>}
				{response && (
					<div className="bg-blue-50 p-6 rounded-lg border border-blue-200 shadow">
						<div className="mb-4 whitespace-pre-line text-blue-900 text-xl font-semibold">{response.answer}</div>
						<div className="flex flex-wrap gap-3 mt-2">
							{response.citations.map(c => (
								<div key={c.chunk_id} className="bg-white border border-blue-300 rounded px-3 py-2 text-sm text-blue-700">
									<span className="font-bold">{c.filename}</span> (Page {c.page})
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</Section>
		);
};

export default ChatPage;
