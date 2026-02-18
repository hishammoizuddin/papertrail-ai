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
                <div className="max-w-4xl mx-auto py-8">
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
