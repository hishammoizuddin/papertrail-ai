import React from 'react';
import { Link } from 'react-router-dom';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-800 text-white">
      <nav className="bg-gray-900 text-white shadow-md p-4">
        <div className="flex justify-between items-center">
          <div className="text-2xl font-bold">PaperTrail AI</div>
          <div className="space-x-4">
            <Link to="/chat" className="hover:text-blue-400">Chat</Link>
            <Link to="/inbox" className="hover:text-blue-400">Inbox</Link>
            <Link to="/timeline" className="hover:text-blue-400">Timeline</Link>
          </div>
        </div>
      </nav>
      <main className="flex-grow p-4">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
