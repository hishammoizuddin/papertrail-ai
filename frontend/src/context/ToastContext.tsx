import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
    duration?: number;
}

interface ToastContextType {
    addToast: (message: string, type: 'success' | 'error' | 'info', duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: 'success' | 'error' | 'info', duration = 3000) => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts((prev) => [...prev, { id, message, type, duration }]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, [removeToast]);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <div className="fixed bottom-4 right-4 z-[10000] flex flex-col gap-2 pointer-events-none">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-center p-4 rounded-lg shadow-lg text-white min-w-[300px] animate-slide-in-right
                            ${toast.type === 'success' ? 'bg-[#34C759]' : ''}
                            ${toast.type === 'error' ? 'bg-[#FF3B30]' : ''}
                            ${toast.type === 'info' ? 'bg-[#0071E3]' : ''}
                        `}
                    >
                        {toast.type === 'success' && <CheckCircle className="w-5 h-5 mr-3" />}
                        {toast.type === 'error' && <AlertCircle className="w-5 h-5 mr-3" />}
                        {toast.type === 'info' && <Info className="w-5 h-5 mr-3" />}
                        <p className="flex-1 text-sm font-medium">{toast.message}</p>
                        <button onClick={() => removeToast(toast.id)} className="ml-3 hover:opacity-80">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
