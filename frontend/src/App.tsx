
import React from 'react';
import './index.css';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ChatPage from './pages/ChatPage';
import { ThemeProvider } from './context/ThemeContext';
import DocumentDetailPage from './pages/DocumentDetailPage';
import InboxPage from './pages/InboxPage';
import TimelinePage from './pages/TimelinePage';
import GraphView from './components/GraphView';
import ArenaPage from './pages/ArenaPage';

import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ProtectedRoute from './components/ProtectedRoute';
import { ToastProvider } from './context/ToastContext';



const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              <Route path="/*" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Routes>
                      <Route path="/" element={
                        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 animate-fade-in">
                          <div className="relative">
                            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 opacity-20 blur-xl animate-pulse"></div>
                            <h1 className="relative text-6xl font-bold tracking-tighter text-[#1D1D1F] dark:text-white sm:text-7xl">
                              PaperTrail <span className="text-[#0071E3] dark:text-[#2997FF]">AI</span>
                            </h1>
                          </div>
                          <p className="text-xl text-[#86868B] max-w-2xl font-medium leading-relaxed dark:text-gray-400">
                            Your intelligent document management solution. Organized, searchable, and beautiful.
                          </p>
                          <div className="flex gap-4 pt-4">
                            <Link to="/inbox" className="px-8 py-4 rounded-full bg-[#0071E3] text-white font-semibold text-lg hover:bg-[#0077ED] shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 dark:bg-[#0071E3] dark:hover:bg-[#0077ED]">
                              Get Started
                            </Link>
                            <Link to="/chat" className="px-8 py-4 rounded-full bg-white text-[#1D1D1F] font-semibold text-lg hover:bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 dark:bg-gray-800 dark:text-white dark:border-gray-700 dark:hover:bg-gray-700">
                              Chat with AI
                            </Link>
                          </div>
                        </div>
                      } />
                      <Route path="/chat" element={<ChatPage />} />
                      <Route path="/inbox" element={<InboxPage />} />
                      <Route path="/timeline" element={<TimelinePage />} />
                      <Route path="/arena" element={<ArenaPage />} />
                      <Route path="/graph" element={<GraphView />} />
                      <Route path="/documents/:id" element={<DocumentDetailPage />} />
                      <Route path="*" element={
                        <div className="flex flex-col items-center justify-center min-h-[60vh]">
                          <h1 className="text-4xl font-bold mb-4 text-[#1D1D1F] dark:text-white">404</h1>
                          <p className="text-lg text-gray-500 dark:text-gray-400">Page not found</p>
                          <Link to="/" className="mt-8 text-[#0071E3] hover:underline dark:text-[#2997FF]">Go Home</Link>
                        </div>
                      } />
                    </Routes>
                  </AppLayout>
                </ProtectedRoute>
              } />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
