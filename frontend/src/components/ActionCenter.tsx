import React, { useEffect, useState } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { Badge } from './ui/Badge';
import axios from 'axios';

interface ActionItem {
    id: number;
    type: 'email' | 'calendar' | 'todo';
    description: string;
    status: string;
    payload: any;
    created_at: string;
}

const ActionCenter: React.FC = () => {
    const [actions, setActions] = useState<ActionItem[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchActions = async () => {
        try {
            const res = await axios.get('http://localhost:8000/api/actions/');
            setActions(res.data);
        } catch (error) {
            console.error("Failed to fetch actions:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActions();
        // Poll for new actions every 10 seconds
        const interval = setInterval(fetchActions, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleExecute = async (action: ActionItem) => {
        if (action.type === 'email') {
            const { recipient, subject, body_template } = action.payload;
            const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body_template)}`;
            window.open(mailtoLink, '_blank');
        } else if (action.type === 'calendar') {
            const { title, date } = action.payload;
            // Simple google calendar link
            const gcalLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${date.replace(/-/g, '')}/${date.replace(/-/g, '')}`;
            window.open(gcalLink, '_blank');
        }

        // Mark as completed
        try {
            await axios.post(`http://localhost:8000/api/actions/${action.id}/status`, { status: 'completed' });
            fetchActions();
        } catch (e) {
            console.error("Failed to update status", e);
        }
    };

    const handleDismiss = async (id: number) => {
        try {
            await axios.post(`http://localhost:8000/api/actions/${id}/status`, { status: 'dismissed' });
            fetchActions();
        } catch (e) {
            console.error("Failed to update status", e);
        }
    };

    if (loading) return <div className="p-4 text-center text-gray-400">Loading actions...</div>;
    if (actions.length === 0) return (
        <Card className="p-6 text-center text-gray-500 dark:text-gray-400 bg-gray-50/50 dark:bg-gray-800/50 border-dashed border-2 border-gray-200 dark:border-gray-700">
            <div className="mb-2 text-2xl">🎉</div>
            No pending actions. You're all caught up!
        </Card>
    );

    return (
        <Card className="flex flex-col gap-4 max-h-[400px] overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-white">Suggested Actions</h3>
                <Badge color="primary">{actions.length} Pending</Badge>
            </div>

            <div className="space-y-3">
                {actions.map(action => {
                    const isHighSeverity = action.payload?.severity === 'high';
                    const isExpired = action.description.startsWith('EXPIRED');

                    return (
                        <div key={action.id} className={`group flex items-start justify-between gap-4 p-4 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200
                        ${isHighSeverity ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
                            <div className="flex gap-3">
                                <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center text-lg
                                ${isHighSeverity ? 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400' :
                                        action.type === 'email' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' :
                                            action.type === 'calendar' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400' : 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400'}`}>
                                    {isExpired ? '⚠️' : action.type === 'email' ? '✉️' : action.type === 'calendar' ? '📅' : '✅'}
                                </div>
                                <div>
                                    <div className={`font-medium ${isHighSeverity ? 'text-red-900 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}>{action.description}</div>
                                    <div className={`text-xs mt-0.5 ${isHighSeverity ? 'text-red-700 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {new Date(action.created_at).toLocaleDateString()} • {action.type.toUpperCase()}
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDismiss(action.id)} className={`p-2 rounded-full transition-colors ${isHighSeverity ? 'text-red-400 hover:text-red-600 hover:bg-red-100' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`} title="Dismiss">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                                <Button onClick={() => handleExecute(action)} className={`px-4 py-1.5 text-xs h-8 ${isHighSeverity ? '!bg-red-600 hover:!bg-red-700' : ''}`}>
                                    {action.type === 'email' ? 'Draft' : action.type === 'calendar' ? 'Add' : 'Do it'}
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </div>
        </Card>
    );
};

export default ActionCenter;
