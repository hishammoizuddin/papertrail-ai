import React, { useState, useEffect } from 'react';

import ArenaSetup from '../components/arena/ArenaSetup';
import ArenaBattle from '../components/arena/ArenaBattle';
import {
    startArena,
    playTurn,
    ArenaStartRequest,
    ArenaPersona
} from '../api/arena';

const ArenaPage: React.FC = () => {
    const [mode, setMode] = useState<'SETUP' | 'BATTLE'>('SETUP');
    const [isLoading, setIsLoading] = useState(false);

    // Session State
    const [context, setContext] = useState('');
    const [personaA, setPersonaA] = useState<ArenaPersona | null>(null);
    const [personaB, setPersonaB] = useState<ArenaPersona | null>(null);
    const [messages, setMessages] = useState<{ speaker: string, content: string, isPersonaA: boolean }[]>([]);

    // Auto-play logic
    const [autoPlay, setAutoPlay] = useState(false);

    const handleStart = async (req: ArenaStartRequest) => {
        setIsLoading(true);
        try {
            const res = await startArena(req);
            setContext(res.context);
            setPersonaA(req.persona_a);
            setPersonaB(req.persona_b);

            // Add initial message from Persona A
            setMessages([{
                speaker: req.persona_a.name,
                content: res.initial_message,
                isPersonaA: true
            }]);

            setMode('BATTLE');
        } catch (e) {
            console.error(e);
            alert("Failed to start the debate. Check console for details.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleNextTurn = async () => {
        if (!personaA || !personaB || isLoading) return;

        // Determine who's next
        const lastMsg = messages[messages.length - 1];
        const nextSpeaker = lastMsg.isPersonaA ? personaB : personaA;
        const isNextA = !lastMsg.isPersonaA;

        setIsLoading(true);
        try {
            const res = await playTurn({
                history: messages.map(m => ({ speaker: m.speaker, content: m.content })),
                current_speaker: nextSpeaker,
                context: context
            });

            setMessages(prev => [...prev, {
                speaker: res.speaker,
                content: res.message,
                isPersonaA: isNextA
            }]);
        } catch (e) {
            console.error(e);
            setAutoPlay(false); // Stop autoplay on error
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-play effect
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;
        if (autoPlay && !isLoading) {
            timeout = setTimeout(() => {
                handleNextTurn();
            }, 2000); // 2 second delay between turns
        }
        return () => clearTimeout(timeout);
    }, [autoPlay, messages, isLoading]);

    return (
        <div className="p-4 sm:p-8 animate-fade-in relative min-h-[90vh]">
            {mode === 'SETUP' && (
                <div className="max-w-4xl mx-auto py-8 space-y-8">
                    {/* User Education */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
                        <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Welcome to the Arena</h1>
                        <p className="text-gray-600 dark:text-gray-300 text-lg mb-8 leading-relaxed">
                            The Arena is a simulation space where different AI personas debate and analyze your documents from unique perspectives.
                            It helps you uncover blind spots, challenge assumptions, and explore alternative viewpoints.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                                <div className="font-bold text-lg mb-2 text-gray-900 dark:text-white">1. Choose Topic</div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Define what the AI should analyze or debate about.</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                                <div className="font-bold text-lg mb-2 text-gray-900 dark:text-white">2. Select Perspectives</div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Pick two opposing personas to analyze the topic.</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
                                <div className="font-bold text-lg mb-2 text-gray-900 dark:text-white">3. Watch Simulation</div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">Observe the debate and get deep insights.</p>
                            </div>
                        </div>
                    </div>

                    <ArenaSetup onStart={handleStart} isLoading={isLoading} />
                </div>
            )}

            {mode === 'BATTLE' && personaA && personaB && (
                <ArenaBattle
                    personaA={personaA}
                    personaB={personaB}
                    messages={messages}
                    isTurnLoading={isLoading}
                    onNextTurn={handleNextTurn}
                    autoPlay={autoPlay}
                    onToggleAutoPlay={() => setAutoPlay(!autoPlay)}
                />
            )}
        </div>
    );
};

export default ArenaPage;
