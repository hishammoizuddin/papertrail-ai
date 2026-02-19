import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import { Plus, X, Search, Filter } from 'lucide-react';
import Card from './ui/Card';

export interface QueryRule {
    id: string;
    field: string;
    operator: string;
    value: string;
}

interface QueryBuilderProps {
    onQueryChange: (rules: QueryRule[]) => void;
    availableFields?: string[];
}

const OPERATORS = [
    { value: 'contains', label: 'contains' },
    { value: 'equals', label: 'is exactly' },
    { value: 'starts_with', label: 'starts with' },
    { value: 'ends_with', label: 'ends with' },
    // { value: 'gt', label: '>' }, // Numeric only
    // { value: 'lt', label: '<' },
];

const FIELDS = [
    { value: 'label', label: 'Name / Label' },
    { value: 'type', label: 'Type' },
    { value: 'summary', label: 'Summary' },
    // Add dynamic properties if possible
];

export const QueryBuilder: React.FC<QueryBuilderProps> = ({ onQueryChange }) => {
    const [rules, setRules] = useState<QueryRule[]>([]);

    const addRule = () => {
        const newRule: QueryRule = {
            id: Math.random().toString(36).substr(2, 9),
            field: 'label',
            operator: 'contains',
            value: ''
        };
        const newRules = [...rules, newRule];
        setRules(newRules);
        onQueryChange(newRules);
    };

    const removeRule = (id: string) => {
        const newRules = rules.filter(r => r.id !== id);
        setRules(newRules);
        onQueryChange(newRules);
    };

    const updateRule = (id: string, key: keyof QueryRule, val: string) => {
        const newRules = rules.map(r => r.id === id ? { ...r, [key]: val } : r);
        setRules(newRules);
        onQueryChange(newRules);
    };

    return (
        <Card className="p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Advanced Filters
                </h4>
                <Button variant="secondary" onClick={addRule} className="text-xs py-1 px-2 h-auto">
                    <Plus className="w-3 h-3 mr-1" /> Add Rule
                </Button>
            </div>

            {rules.length === 0 ? (
                <div className="text-sm text-gray-400 italic text-center py-2">
                    No active filters. Add a rule to refine results.
                </div>
            ) : (
                <div className="space-y-2">
                    {rules.map((rule, idx) => (
                        <div key={rule.id} className="flex items-center gap-2 animate-fade-in">
                            {idx > 0 && <span className="text-xs font-bold text-gray-400 uppercase w-8 text-center">AND</span>}

                            <select
                                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={rule.field}
                                onChange={(e) => updateRule(rule.id, 'field', e.target.value)}
                            >
                                {FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                            </select>

                            <select
                                className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={rule.operator}
                                onChange={(e) => updateRule(rule.id, 'operator', e.target.value)}
                            >
                                {OPERATORS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                            </select>

                            <Input
                                className="h-8 text-sm flex-1"
                                placeholder="Value..."
                                value={rule.value}
                                onChange={(e: any) => updateRule(rule.id, 'value', e.target.value)}
                            />

                            <button onClick={() => removeRule(rule.id)} className="text-gray-400 hover:text-red-500 p-1">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};
