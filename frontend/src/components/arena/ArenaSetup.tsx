import React, { useState, useEffect } from 'react';
import Card from '../ui/Card';
import { ArenaPersona, ArenaStartRequest } from '../../api/arena';
import { listDocuments, Document } from '../../api/documents';

interface ArenaSetupProps {
    onStart: (req: ArenaStartRequest) => void;
    isLoading: boolean;
}

const PRESET_PERSONAS = [
    { name: 'Skeptic', role: 'Critical Risk Analyst who finds flaws in everything' },
    { name: 'Optimist', role: 'Visionary Strategist who sees opportunity everywhere' },
    { name: 'Legal Eagle', role: 'Strict Corporate Lawyer focused on compliance' },
    { name: 'Budget Hawk', role: 'Financial Controller focused on cost reduction' },
    { name: 'Tech Bro', role: 'Innovation-obsessed Technologist' }
];

const ArenaSetup: React.FC<ArenaSetupProps> = ({ onStart, isLoading }) => {
    const [topic, setTopic] = useState('');
    const [documents, setDocuments] = useState<Document[]>([]);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

    // Personas
    const [personaA, setPersonaA] = useState<ArenaPersona>(PRESET_PERSONAS[0]);
    const [personaB, setPersonaB] = useState<ArenaPersona>(PRESET_PERSONAS[1]);

    useEffect(() => {
        listDocuments()
            .then(docs => {
                if (Array.isArray(docs)) {
                    setDocuments(docs);
                } else {
                    console.error("Expected array of documents", docs);
                    setDocuments([]);
                }
            })
            .catch(err => {
                console.error("Failed to load documents", err);
                setDocuments([]); // Ensure it's always an array
            });
    }, []);

    const handleStart = () => {
        if (!topic.trim()) return;
        onStart({
            topic,
            document_ids: selectedDocIds,
            persona_a: personaA,
            persona_b: personaB
        });
    };

    const toggleDoc = (id: string) => {
        setSelectedDocIds(prev =>
            prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
        );
    };

    return (
        <Card className="max-w-4xl mx-auto p-8 animate-slide-up border border-gray-100 dark:border-gray-800 shadow-xl">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Simulation Setup
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                    Configure the parameters for your AI analysis session.
                </p>
            </div>

            <div className="space-y-8">
                {/* Topic Section */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Scenario / Topic
                    </label>
                    <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. Analyze the risk factors in the attached contracts."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                </div>

                {/* Document Selection */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Context Documents
                    </label>
                    <div className="min-h-[100px] max-h-60 overflow-y-auto p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-900/50">
                        {documents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full py-4 text-gray-400 text-sm">
                                <p>No documents found or loading...</p>
                                <p className="text-xs mt-1">Make sure you have uploaded documents in the Dashboard.</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {documents.map(doc => (
                                    <button
                                        key={doc.id}
                                        onClick={() => toggleDoc(doc.id)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${selectedDocIds.includes(doc.id)
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                                            }`}
                                    >
                                        {doc.filename}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Fighters Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Perspective A */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Perspective A</h3>
                        <select
                            className="w-full p-2.5 mb-3 rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                            onChange={(e) => setPersonaA(PRESET_PERSONAS[parseInt(e.target.value)])}
                        >
                            {PRESET_PERSONAS.map((p, i) => (
                                <option key={i} value={i} selected={p.name === personaA.name}>{p.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">{personaA.role}</p>
                    </div>

                    {/* Perspective B */}
                    <div className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Perspective B</h3>
                        <select
                            className="w-full p-2.5 mb-3 rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
                            onChange={(e) => setPersonaB(PRESET_PERSONAS[parseInt(e.target.value)])}
                        >
                            {PRESET_PERSONAS.map((p, i) => (
                                <option key={i} value={i} selected={p.name === personaB.name}>{p.name}</option>
                            ))}
                        </select>
                        <div className="text-xs text-gray-500 dark:text-gray-400 italic">{personaB.role}</div>
                    </div>
                </div>

                {/* Action */}
                <button
                    onClick={handleStart}
                    disabled={isLoading || !topic}
                    className="w-full py-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
                >
                    {isLoading ? 'Initializing Simulation...' : 'Start Simulation'}
                </button>
            </div>
        </Card>
    );
};

export default ArenaSetup;
