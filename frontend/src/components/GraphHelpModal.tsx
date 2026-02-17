import React from 'react';
import { Modal } from './ui/Modal';
import { BookOpen, Share2, Search, Filter } from 'lucide-react';

interface GraphHelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GraphHelpModal: React.FC<GraphHelpModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="How to use the Knowledge Map">
            <div className="space-y-6 text-sm text-gray-600 dark:text-gray-300">

                {/* Intro */}
                <p>
                    The Knowledge Map visualizes connections between your documents, the people mentioned in them, organizations, and more.
                    It helps you find hidden relationships and understand your data better.
                </p>

                {/* Legend / Node Types */}
                <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Node Types</h4>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#0071E3]"></span>
                            <span>Documents (Files)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#34C759]"></span>
                            <span>Issuers (Senders)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#AF52DE]"></span>
                            <span>People</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#5856D6]"></span>
                            <span>Organizations</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#FF9500]"></span>
                            <span>Categories</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-[#5AC8FA]"></span>
                            <span>Locations</span>
                        </div>
                    </div>
                </div>

                {/* Interactions */}
                <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Interactions</h4>
                    <ul className="space-y-3">
                        <li className="flex gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg h-fit">
                                <Share2 className="w-4 h-4 text-blue-500" />
                            </div>
                            <div>
                                <span className="font-medium text-gray-900 dark:text-white block">Click a Node</span>
                                See detailed properties and jump to the Dossier view.
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg h-fit">
                                <Search className="w-4 h-4 text-blue-500" />
                            </div>
                            <div>
                                <span className="font-medium text-gray-900 dark:text-white block">Search</span>
                                Quickly find a specific document or person by name.
                            </div>
                        </li>
                        <li className="flex gap-3">
                            <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg h-fit">
                                <BookOpen className="w-4 h-4 text-blue-500" />
                            </div>
                            <div>
                                <span className="font-medium text-gray-900 dark:text-white block">Dossier</span>
                                Open a comprehensive profile for any entity to see all related files and actions.
                            </div>
                        </li>
                    </ul>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-900/30 text-blue-800 dark:text-blue-200">
                    <strong>Pro Tip:</strong> Use "Trace The Trail" to highlight paths and see how entities are connected across different documents.
                </div>
            </div>
        </Modal>
    );
};
