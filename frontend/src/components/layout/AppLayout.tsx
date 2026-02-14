import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navLinks = [
  { to: '/inbox', label: 'Inbox' },
  { to: '/timeline', label: 'Timeline' },
  { to: '/chat', label: 'Chat' },
];

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold text-blue-600 tracking-tight">PaperTrail <span className="text-orange-400">AI</span></span>
          </div>
          <nav className="flex gap-6">
            {navLinks.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-base font-medium transition-colors px-2 py-1 rounded-md ${pathname.startsWith(link.to) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:text-blue-600'}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 py-4 text-center text-sm text-gray-400">
        &copy; {new Date().getFullYear()} PaperTrail AI. All rights reserved.
      </footer>
    </div>
  );
};
