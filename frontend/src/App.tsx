
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import InboxPage from './pages/InboxPage';
import DocumentDetailPage from './pages/DocumentDetailPage';
import TimelinePage from './pages/TimelinePage';
import ChatPage from './pages/ChatPage';
import { AppLayout } from './components/layout/AppLayout';


function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/inbox" />} />
          <Route path="/inbox" element={<InboxPage />} />
          <Route path="/documents/:id" element={<DocumentDetailPage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/chat" element={<ChatPage />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

export default App;
