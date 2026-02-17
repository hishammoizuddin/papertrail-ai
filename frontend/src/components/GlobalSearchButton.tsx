import React from 'react';
import { Link } from 'react-router-dom';

interface GlobalSearchButtonProps {
    actionCount?: number;
}

const GlobalSearchButton: React.FC<GlobalSearchButtonProps> = ({ actionCount = 0 }) => (
    <Link to="/chat" className="w-full group block">
        <div className="bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-900 dark:text-white p-5 rounded-2xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 transition-all transform hover:scale-[1.01] flex items-center justify-between relative overflow-hidden group-hover:border-blue-300 dark:group-hover:border-blue-700">
            <div className="relative z-10">
                <div className="font-bold text-xl tracking-tight">Ask Your Knowledge Base</div>
                <div className="text-gray-500 dark:text-gray-400 text-sm mt-1 font-medium">Global search across {actionCount > 0 ? 'documents & actions' : 'all documents'}</div>
            </div>
            <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-500/30 text-white relative z-10 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            {/* Subtle background decoration - simplified for clean theme */}
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/10 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
        </div>
    </Link>
);

export default GlobalSearchButton;
