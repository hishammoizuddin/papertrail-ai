import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname.startsWith(path) ? 'text-black font-medium' : 'text-gray-500 hover:text-black transition-colors';
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7] text-[#1D1D1F]">
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 h-14 flex justify-between items-center">
          <Link to="/" className="text-xl font-semibold tracking-tight">PaperTrail AI</Link>
          <Link to="/chat" className={isActive('/chat')}>Chat</Link>
          <Link to="/inbox" className={isActive('/inbox')}>Inbox</Link>
          <Link to="/graph" className={isActive('/graph')}>Brain</Link>
        </div>
      </nav>
      <main className="flex-grow pt-20 px-6 pb-12 w-full max-w-7xl mx-auto animate-fade-in">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
