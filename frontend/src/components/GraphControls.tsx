import React, { useState, useEffect } from 'react';
import Button from './ui/Button';
import { Search, Filter, HelpCircle, RefreshCw, AlertTriangle, Route } from 'lucide-react';
import Input from './ui/Input';
import { QueryBuilder, QueryRule } from './QueryBuilder';

interface GraphControlsProps {
    onSearch: (query: string) => void;
    onFilterChange: (type: string, isVisible: boolean) => void;
    onQueryChange: (rules: QueryRule[]) => void; // New Prop
    onRebuild: () => void;
    onAnalyze: () => void;
    onToggleAudit: () => void;
    onOpenHelp: () => void;

    isRebuilding: boolean;
    isAnalyzing: boolean;
    isAuditMode: boolean;
    conflictCount: number;
    nodes: any[]; // For autocomplete
    availableTypes: string[];
}

export const GraphControls: React.FC<GraphControlsProps> = ({
    onSearch,
    onFilterChange,
    onQueryChange,
    onRebuild,
    onAnalyze,
    onToggleAudit,
    onOpenHelp,

    isRebuilding,
    isAnalyzing,
    isAuditMode,
    conflictCount,
    nodes,
    availableTypes
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
    const [showFilters, setShowFilters] = useState(false);
    const [showQueryBuilder, setShowQueryBuilder] = useState(false); // New State
    const [suggestions, setSuggestions] = useState<any[]>([]);

    // Initialize/Update active filters when availableTypes change
    useEffect(() => {
        // If it's the first load (empty filters), activate all
        // Or if new types appear, activate them.
        // Simplest strategy: If we have new types that aren't tracked, add them to active.
        if (availableTypes.length > 0) {
            const newFilters = new Set(activeFilters);
            let changed = false;
            availableTypes.forEach(t => {
                if (!newFilters.has(t) && !activeFilters.has(t)) {
                    // Wait, we need to know if it was explicitly disabled.
                    // For now, let's just default all to TRUE on initial load.
                    // But we need to track "disabled" types instead of "active" types for better UX?
                    // The parent uses "hiddenTypes".
                    // Let's stick to activeFilters for UI state.
                }
            });

            // Better approach: Synchronize with what the user sees.
            // The parent manages "hiddenTypes". Here we manage UI toggle state.
            // Let's just set all to active initially.
            if (activeFilters.size === 0) {
                setActiveFilters(new Set(availableTypes));
            } else {
                // Add any new types
                const updated = new Set(activeFilters);
                availableTypes.forEach(t => {
                    // If we haven't seen this type before (complex to track 'seen'), just add it?
                    // For now, let's just ensure if availableTypes grows, we include them.
                    // A simpler way: The parent should probably tell us what is hidden.
                    // But sticking to the requested refactor:
                    if (!updated.has(t)) updated.add(t);
                });
                if (updated.size !== activeFilters.size) setActiveFilters(updated);
            }
        }
    }, [availableTypes]);


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
        let isVisible = false;
        if (newFilters.has(type)) {
            newFilters.delete(type);
            isVisible = false;
        } else {
            newFilters.add(type);
            isVisible = true;
        }
        setActiveFilters(newFilters);
        onFilterChange(type, isVisible);
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
                        <Button variant="secondary" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2" title="Filter nodes by type">
                            <Filter className="w-4 h-4" />
                            Filters
                        </Button>
                        {showFilters && (
                            <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-gray-800 rounded-lg shadow-xl w-48 z-30 max-h-60 overflow-y-auto">
                                <div className="space-y-2">
                                    {availableTypes.length > 0 ? availableTypes.map(type => (
                                        <label key={type} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300 capitalize hover:text-blue-500">
                                            <input
                                                type="checkbox"
                                                checked={activeFilters.has(type)}
                                                onChange={() => handleFilterToggle(type)}
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            {type}
                                        </label>
                                    )) : <div className="text-gray-400 text-xs text-center py-2">No entity types found</div>}
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
                        title="Trace the flow of connections from a selected node"
                    >
                        <Route className="w-4 h-4" />
                        {isAuditMode ? 'Exit Trace' : 'Trace Trail'}
                    </Button>

                    <Button
                        variant={conflictCount > 0 ? 'danger' : 'secondary'}
                        onClick={onAnalyze}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2"
                        title="Scan for suspicious patterns (Money Laundering, Shell Companies)"
                    >
                        <AlertTriangle className="w-4 h-4" />
                        {isAnalyzing ? 'Scanning...' : 'Scan Patterns'}
                        {conflictCount > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{conflictCount}</span>}
                    </Button>

                    <Button
                        variant={showQueryBuilder ? 'primary' : 'secondary'}
                        onClick={() => setShowQueryBuilder(!showQueryBuilder)}
                        className="flex items-center gap-2"
                        title="Toggle Visual Query Builder"
                    >
                        <Filter className="w-4 h-4" />
                        Advanced
                    </Button>

                    <Button onClick={onRebuild} disabled={isRebuilding} variant="secondary" title="Rebuild the entire knowledge graph from documents">
                        <RefreshCw className={`w-4 h-4 ${isRebuilding ? 'animate-spin' : ''}`} />
                    </Button>

                    <Button onClick={onOpenHelp} variant="secondary" title="View help and keyboard shortcuts">
                        <HelpCircle className="w-4 h-4" />
                    </Button>


                </div>
            </div>

            {/* Query Builder Area */}
            {showQueryBuilder && (
                <div className="animate-in slide-in-from-top-2 duration-200">
                    <QueryBuilder onQueryChange={onQueryChange} />
                </div>
            )}
        </div>
    );
};
