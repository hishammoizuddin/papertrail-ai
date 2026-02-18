import React, { useEffect, useRef } from 'react';
import Card from '../ui/Card';
import { ArenaPersona } from '../../api/arena';

interface Message {
    speaker: string;
    content: string;
    isPersonaA: boolean;
}

interface ArenaBattleProps {
    personaA: ArenaPersona;
    personaB: ArenaPersona;
    messages: Message[];
    isTurnLoading: boolean;
    onNextTurn: () => void;
    autoPlay: boolean;
    onToggleAutoPlay: () => void;
}

const ArenaBattle: React.FC<ArenaBattleProps> = ({
    personaA,
    personaB,
    messages,
    isTurnLoading,
    onNextTurn,
    autoPlay,
    onToggleAutoPlay
}) => {
    const scrollRefA = useRef<HTMLDivElement>(null);
    const scrollRefB = useRef<HTMLDivElement>(null);

    // Auto-scroll both columns
    useEffect(() => {
        if (scrollRefA.current) {
            scrollRefA.current.scrollTop = scrollRefA.current.scrollHeight;
        }
        if (scrollRefB.current) {
            scrollRefB.current.scrollTop = scrollRefB.current.scrollHeight;
        }
    }, [messages]);

    const messagesA = messages.filter(m => m.isPersonaA);
    const messagesB = messages.filter(m => !m.isPersonaA);

    // Determine whose turn it is for the loading indicator
    const lastMsg = messages[messages.length - 1];
    const isNextA = lastMsg ? !lastMsg.isPersonaA : true; // Default to A if no messages (start)

    return (
        <div className="max-w-6xl mx-auto flex flex-col h-[85vh]">
            {/* Split Header */}
            <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Persona A Header */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-xl">
                        {personaA.name[0]}
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{personaA.name}</h3>
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">{personaA.role}</p>
                    </div>
                </div>

                {/* Persona B Header */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4 justify-end text-right">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">{personaB.name}</h3>
                        <p className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">{personaB.role}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-600 text-xl">
                        {personaB.name[0]}
                    </div>
                </div>
            </div>

            {/* Split Battle Ground */}
            <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">
                {/* Column A */}
                <Card className="flex flex-col overflow-hidden bg-gray-50/50 dark:bg-gray-900/50 border-blue-100 dark:border-blue-900/20">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRefA}>
                        {messagesA.map((msg, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-blue-50 dark:border-gray-700">
                                <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isTurnLoading && isNextA && (
                            <div className="animate-pulse flex gap-2 items-center text-blue-500 font-medium p-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Column B */}
                <Card className="flex flex-col overflow-hidden bg-gray-50/50 dark:bg-gray-900/50 border-red-100 dark:border-red-900/20">
                    <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRefB}>
                        {messagesB.map((msg, idx) => (
                            <div key={idx} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-red-50 dark:border-gray-700">
                                <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-800 dark:text-gray-200">
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isTurnLoading && !isNextA && (
                            <div className="animate-pulse flex gap-2 items-center justify-end text-red-500 font-medium p-2">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            {/* Controls */}
            <div className="mt-4 flex justify-center gap-4">
                <button
                    onClick={onNextTurn}
                    disabled={isTurnLoading || autoPlay}
                    className="px-8 py-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all font-bold text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none"
                >
                    {isTurnLoading ? 'Analyzing...' : 'Next Argument'}
                </button>
                <button
                    onClick={onToggleAutoPlay}
                    className={`px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:-translate-y-0.5 ${autoPlay
                        ? 'bg-gray-900 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200'
                        : 'bg-[#0071E3] text-white hover:bg-[#0077ED]'
                        }`}
                >
                    {autoPlay ? 'Pause Debate' : 'Auto-Play Debate'}
                </button>
            </div>
        </div>
    );
};

export default ArenaBattle;
