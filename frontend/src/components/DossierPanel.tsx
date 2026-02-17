import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, DollarSign, FileText, Activity, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface DossierStats {
    total_documents: number;
    first_interaction: string | null;
    last_interaction: string | null;
    total_value: number | null;
    currency: string;
}

interface DocumentSummary {
    id: string;
    filename: string;
    created_at: string;
    doc_type: string | null;
    status: string;
}

interface ActionItem {
    id: number;
    description: string;
    status: string;
    created_at: string;
}

export interface DossierData {
    node_id: string;
    label: string;
    type: string;
    summary: string | null;
    stats: DossierStats;
    related_documents: DocumentSummary[];
    related_actions: ActionItem[];
}

interface DossierPanelProps {
    isOpen: boolean;
    onClose: () => void;
    data: DossierData | null;
    isLoading: boolean;
}

const DossierPanel: React.FC<DossierPanelProps> = ({ isOpen, onClose, data, isLoading }) => {
    const navigate = useNavigate();

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Prevent scrolling when panel is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.3 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black z-[9998]"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-[#1c1c1e] shadow-2xl z-[9999] overflow-y-auto border-l border-gray-200 dark:border-gray-800"
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : data ? (
                            <div className="p-6 space-y-8 pb-20">
                                {/* Header */}
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 mb-2 uppercase tracking-wide">
                                            {data.type}
                                        </span>
                                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white leading-tight">
                                            {data.label}
                                        </h2>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <X className="w-6 h-6 text-gray-500" />
                                    </button>
                                </div>

                                {/* Summary Section */}
                                {data.summary && (
                                    <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                                            {data.summary}
                                        </p>
                                    </div>
                                )}

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className={`p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900/30 ${!data.stats.total_value ? 'col-span-2' : ''}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                            <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase">Documents</span>
                                        </div>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.stats.total_documents}</p>
                                    </div>

                                    {data.stats.total_value && data.stats.total_value > 0 && (
                                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-100 dark:border-green-900/30">
                                            <div className="flex items-center gap-2 mb-1">
                                                <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase">Identified Value</span>
                                            </div>
                                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: data.stats.currency }).format(data.stats.total_value)}
                                            </p>
                                        </div>
                                    )}

                                    <div className="col-span-2 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-900/30">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                            <span className="text-xs font-medium text-purple-600 dark:text-purple-400 uppercase">Activity Timeline</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">First Interaction</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {data.stats.first_interaction ? format(new Date(data.stats.first_interaction), 'MMM d, yyyy') : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="h-px bg-purple-200 dark:bg-purple-700 flex-1 mx-4 mb-2"></div>
                                            <div className="text-right">
                                                <p className="text-xs text-gray-500 dark:text-gray-400">Last Interaction</p>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {data.stats.last_interaction ? format(new Date(data.stats.last_interaction), 'MMM d, yyyy') : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Related Documents */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-gray-500" />
                                        Associated Documents
                                    </h3>
                                    <div className="space-y-3">
                                        {data.related_documents.length === 0 ? (
                                            <p className="text-sm text-gray-500 italic">No direct documents found.</p>
                                        ) : (
                                            data.related_documents.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    onClick={() => navigate(`/documents/${doc.id}`)}
                                                    className="group flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 text-xs font-bold uppercase">
                                                            {doc.filename.split('.').pop()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[180px]">
                                                                {doc.filename}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                {format(new Date(doc.created_at), 'MMM d, yyyy')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Action Items */}
                                {data.related_actions.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <Activity className="w-5 h-5 text-gray-500" />
                                            Tasks & Actions
                                        </h3>
                                        <div className="space-y-3">
                                            {data.related_actions.map((action) => (
                                                <div key={action.id} className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-100 dark:border-yellow-900/20">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`mt-1 w-2 h-2 rounded-full ${action.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                                                        <p className="text-sm text-gray-800 dark:text-gray-200">{action.description}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                            </div>
                        ) : (
                            <div className="p-6 text-center text-gray-500">
                                <p>No dossier information available.</p>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default DossierPanel;
