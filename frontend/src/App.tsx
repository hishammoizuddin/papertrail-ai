import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import InboxPage from './pages/InboxPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import TimelinePage from './pages/TimelinePage';
import ChatPage from './pages/ChatPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/inbox" />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/documents/:id" element={<DocumentDetailPage />} />
        <Route path="/timeline" element={<TimelinePage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
