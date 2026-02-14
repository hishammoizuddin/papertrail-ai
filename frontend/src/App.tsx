
import React from 'react';
import './index.css';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import InboxPage from './pages/InboxPage';
import TimelinePage from './pages/TimelinePage';

const App = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex bg-gray-100">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-gradient-to-b from-blue-900 via-blue-800 to-blue-700 text-white flex flex-col py-8 px-6 shadow-lg">
          <div className="text-3xl font-extrabold mb-10 tracking-tight">PaperTrail AI</div>
          <nav className="flex flex-col gap-4">
            <Link to="/inbox" className="py-2 px-4 rounded hover:bg-blue-600 font-semibold transition">Inbox</Link>
            <Link to="/chat" className="py-2 px-4 rounded hover:bg-blue-600 font-semibold transition">Chat</Link>
            <Link to="/timeline" className="py-2 px-4 rounded hover:bg-blue-600 font-semibold transition">Timeline</Link>
          </nav>
          <div className="mt-auto text-xs text-blue-200 pt-10">&copy; 2026 PaperTrail AI</div>
        </aside>
        {/* Main Content */}
        <main className="flex-1 p-10 overflow-y-auto">
          <Routes>
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/inbox" element={<InboxPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/documents/:id" element={<DocumentDetailPage />} />
            <Route path="*" element={
              <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-5xl font-extrabold mb-6 text-blue-900">Welcome to PaperTrail AI</h1>
                <p className="text-xl text-blue-700 mb-8">Your ultimate document management solution</p>
                <div className="flex gap-4">
                  <Link to="/inbox" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded text-lg font-semibold">Inbox</Link>
                  <Link to="/chat" className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded text-lg font-semibold">Chat</Link>
                  <Link to="/timeline" className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded text-lg font-semibold">Timeline</Link>
                </div>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;
