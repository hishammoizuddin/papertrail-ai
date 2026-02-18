
const API_URL = 'http://localhost:8000/api/arena';

export interface ArenaPersona {
    name: string;
    role: string;
}

export interface ArenaStartRequest {
    topic: string;
    document_ids: string[];
    persona_a: ArenaPersona;
    persona_b: ArenaPersona;
}

export interface ArenaTurnRequest {
    history: { speaker: string; content: string }[];
    current_speaker: ArenaPersona;
    context: string;
}

export interface ArenaResponse {
    speaker: string;
    message: string;
}

export interface ArenaStartResponse {
    session_id: string;
    initial_message: string;
    context: string;
}

export const startArena = async (req: ArenaStartRequest): Promise<ArenaStartResponse> => {
    const response = await fetch(`${API_URL}/start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(req),
    });

    if (!response.ok) {
        throw new Error('Failed to start arena session');
    }

    return response.json();
};

export const playTurn = async (req: ArenaTurnRequest): Promise<ArenaResponse> => {
    const response = await fetch(`${API_URL}/turn`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(req),
    });

    if (!response.ok) {
        throw new Error('Failed to play turn');
    }

    return response.json();
};
