import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import { Search, Filter, HelpCircle, RefreshCw, AlertTriangle, Route } from 'lucide-react';
import Input from './ui/Input';

interface GraphControlsProps {
    onSearch: (query: string) => void;
    onFilterChange: (type: string, isVisible: boolean) => void;
    onRebuild: () => void;
    onAnalyze: () => void;
    onToggleAudit: () => void;
    onOpenHelp: () => void;
    isRebuilding: boolean;
    isAnalyzing: boolean;
    isAuditMode: boolean;
    conflictCount: number;
    nodes: any[]; // For autocomplete
}

export const GraphControls: React.FC<GraphControlsProps> = ({
    onSearch,
    onFilterChange,
    onRebuild,
    onAnalyze,
    onToggleAudit,
    onOpenHelp,
    isRebuilding,
    isAnalyzing,
    isAuditMode,
    conflictCount,
    nodes
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set(['document', 'person', 'organization', 'issuer', 'category', 'tag', 'location', 'uncategorized']));
    const [showFilters, setShowFilters] = useState(false);
    const [suggestions, setSuggestions] = useState<any[]>([]);

    useEffect(() => {
        if (searchQuery.trim().length > 1) {
            const lowerQuery = searchQuery.toLowerCase();
            const matches = nodes.filter(n => n.label.toLowerCase().includes(lowerQuery)).slice(0, 5);
            setSuggestions(matches);
        } else {
            setSuggestions([]);
        }
    }, [searchQuery, nodes]);

    const handleFilterToggle = (type: string) => {
        const newFilters = new Set(activeFilters);
        if (newFilters.has(type)) {
            newFilters.delete(type);
        } else {
            newFilters.add(type);
        }
        setActiveFilters(newFilters);
        onFilterChange(type, newFilters.has(type));
    };

    const handleSearchSelect = (label: string) => {
        setSearchQuery(label);
        onSearch(label);
        setSuggestions([]);
    };

    return (
        <div className="flex flex-col gap-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Left: Search & Filters */}
                <div className="flex items-center gap-2 flex-1 relative z-20">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search entities, docs..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter') {
                                    onSearch(searchQuery);
                                    setSuggestions([]);
                                }
                            }}
                        />
                        {suggestions.length > 0 && (
                            <div className="absolute top-full left-0 w-full bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl mt-1 overflow-hidden">
                                {suggestions.map(node => (
                                    <div
                                        key={node.id}
                                        className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer text-sm flex justify-between items-center"
                                        onClick={() => handleSearchSelect(node.label)}
                                    >
                                        <span className="text-gray-900 dark:text-white truncate">{node.label}</span>
                                        <span className="text-xs text-gray-500 capitalize">{node.type}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <Button variant="secondary" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            Filters
                        </Button>
                        {showFilters && (
                            <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl w-48 z-30">
                                <div className="space-y-2">
                                    {['document', 'person', 'organization', 'issuer', 'category', 'tag', 'location', 'uncategorized'].map(type => (
                                        <label key={type} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300 capitalize hover:text-blue-500">
                                            <input
                                                type="checkbox"
                                                checked={activeFilters.has(type)}
                                                onChange={() => handleFilterToggle(type)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            {type}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    <Button
                        variant={isAuditMode ? 'primary' : 'secondary'}
                        onClick={onToggleAudit}
                        className="flex items-center gap-2"
                    >
                        <Route className="w-4 h-4" />
                        {isAuditMode ? 'Exit Trace' : 'Trace Trail'}
                    </Button>

                    <Button
                        variant={conflictCount > 0 ? 'danger' : 'secondary'}
                        onClick={onAnalyze}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2"
                    >
                        <AlertTriangle className="w-4 h-4" />
                        {isAnalyzing ? 'Analyzing...' : 'Conflicts'}
                        {conflictCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{conflictCount}</span>}
                    </Button>

                    <Button onClick={onRebuild} disabled={isRebuilding} variant="secondary" title="Rebuild Graph">
                        <RefreshCw className={`w-4 h-4 ${isRebuilding ? 'animate-spin' : ''}`} />
                    </Button>

                    <Button onClick={onOpenHelp} variant="secondary" title="Help">
                        <HelpCircle className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};
