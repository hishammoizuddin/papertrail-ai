import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

import Logo from '../Logo';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { user, logout } = useAuth() as any;

  const isActive = (path: string) => {
    return location.pathname.startsWith(path)
      ? 'text-black dark:text-white font-medium'
      : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <nav className="fixed top-0 left-0 right-0 z-50 glass dark:glass-dark border-b border-white/20 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <Logo size={24} />
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/chat" className={isActive('/chat')}>Chat</Link>
            <Link to="/inbox" className={isActive('/inbox')}>Dashboard</Link>
            <Link to="/graph" className={isActive('/graph')}>Knowledge Map</Link>
            <div className="border-l border-gray-300 dark:border-gray-700 h-6 mx-2"></div>
            {user && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Welcome, {user.email?.split('@')[0]}
                </span>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              )}
            </button>
          </div>
        </div>
      </nav>
      <main className="flex-grow pt-20 px-6 pb-12 w-full max-w-7xl mx-auto animate-fade-in">
        {children}
      </main>
    </div>
  );
};

export default AppLayout;
