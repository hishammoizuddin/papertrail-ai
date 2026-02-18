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
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="max-w-5xl mx-auto flex flex-col h-[80vh]">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 px-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-600">
                        {personaA.name[0]}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{personaA.name}</h3>
                        <p className="text-xs text-gray-500">{personaA.role}</p>
                    </div>
                </div>

                <div className="px-4 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-bold text-gray-500 tracking-wider">
                    VS
                </div>

                <div className="flex items-center gap-3 text-right">
                    <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">{personaB.name}</h3>
                        <p className="text-xs text-gray-500">{personaB.role}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center font-bold text-red-600">
                        {personaB.name[0]}
                    </div>
                </div>
            </div>

            {/* Chat Area */}
            <Card className="flex-1 overflow-hidden flex flex-col relative bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
                <div className="flex-1 overflow-y-auto p-6 space-y-6" ref={scrollRef}>
                    {messages.map((msg, user_idx) => (
                        <div key={user_idx} className={`flex ${msg.isPersonaA ? 'justify-start' : 'justify-end'}`}>
                            <div className={`
                                max-w-[80%] p-5 rounded-2xl shadow-sm border
                                ${msg.isPersonaA
                                    ? 'bg-white border-blue-100 rounded-tl-none text-gray-800 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200'
                                    : 'bg-red-50 border-red-100 rounded-tr-none text-gray-800 dark:bg-gray-900 dark:border-red-900/30 dark:text-gray-200'
                                }
                            `}>
                                <div className={`text-xs font-bold mb-1 ${msg.isPersonaA ? 'text-blue-500' : 'text-red-500'}`}>
                                    {msg.speaker}
                                </div>
                                <div className="leading-relaxed whitespace-pre-wrap">
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isTurnLoading && (
                        <div className="flex justify-center py-4">
                            <div className="animate-pulse text-sm text-gray-400 font-medium">
                                Thinking...
                            </div>
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm flex justify-center gap-4">
                    <button
                        onClick={onNextTurn}
                        disabled={isTurnLoading || autoPlay}
                        className="px-6 py-2 rounded-full bg-white border border-gray-200 shadow-sm hover:shadow hover:bg-gray-50 transition-all font-medium text-gray-700 disabled:opacity-50"
                    >
                        Next Turn
                    </button>
                    <button
                        onClick={onToggleAutoPlay}
                        className={`px-6 py-2 rounded-full font-bold transition-all shadow-md ${autoPlay
                                ? 'bg-red-500 text-white hover:bg-red-600'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                    >
                        {autoPlay ? 'Pause' : 'Auto-Play'}
                    </button>
                </div>
            </Card>
        </div>
    );
};

export default ArenaBattle;
