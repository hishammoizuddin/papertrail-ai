import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Section } from './ui/Section';
import Card from './ui/Card';
import { Badge } from './ui/Badge';
import Button from './ui/Button';
import axios from 'axios';
import DossierPanel, { DossierData } from './DossierPanel';
import { BookOpen } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { GraphControls } from './GraphControls';
import { GraphHelpModal } from './GraphHelpModal';
import { useToast } from '../context/ToastContext';

interface Node {
    id: string;
    label: string;
    type: string;
    properties: any;
    val?: number;
    color?: string;
    x?: number;
    y?: number;
}

interface Link {
    source: string | Node;
    target: string | Node;
    relation: string;
}

interface GraphData {
    nodes: Node[];
    links: Link[];
}

const GraphView: React.FC = () => {
    const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
    const { theme } = useTheme();
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const graphRef = useRef<any>(null); // Ref to ForceGraph instance
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    const truncateLabel = (label: string, maxLength: number = 20) => {
        if (label.length <= maxLength) return label;
        return label.substring(0, maxLength) + '...';
    };

    const [rebuilding, setRebuilding] = useState(false);

    // Advanced Features State
    const [auditMode, setAuditMode] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [conflicts, setConflicts] = useState<any[]>([]);
    const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
    const [highlightedLinks, setHighlightedLinks] = useState<Set<string>>(new Set());

    // Dossier State
    const [isDossierOpen, setIsDossierOpen] = useState(false);
    const [dossierData, setDossierData] = useState<DossierData | null>(null);
    const [loadingDossier, setLoadingDossier] = useState(false);

    // UX State
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [filteredData, setFilteredData] = useState<GraphData>({ nodes: [], links: [] });
    const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(new Set());

    // Dynamic Color Generation
    const stringToColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        // Use HSL for better distinctness and aesthetics
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 70%, 50%)`;
    };

    const [availableTypes, setAvailableTypes] = useState<string[]>([]);

    const fetchGraph = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/graph/data');
            const graphData = res.data;

            // Extract unique types for filters and legend
            const types = new Set<string>();

            // Process data for visualization
            const nodes = graphData.nodes.map((n: any) => {
                let val = 8;
                const type = n.type.toLowerCase(); // Normalize
                types.add(type);

                // Dynamic Color
                const color = stringToColor(type);

                // Adjust size based on importance (still keep some heuristics for size if desired, or make generic)
                if (type === 'document') val = 15;
                else if (type === 'issuer' || type === 'category') val = 12;
                else val = 8;

                return {
                    ...n,
                    type, // Ensure normalized
                    val,
                    color,
                    properties: n.properties || {}
                };
            });

            setAvailableTypes(Array.from(types).sort());

            const newData = { nodes, links: graphData.links };
            setData(newData);
            // Initial filter application
            filterGraphData(newData, hiddenTypes);

        } catch (error) {
            console.error("Failed to fetch graph data:", error);
            addToast("Failed to load Knowledge Graph", 'error');
        } finally {
            setLoading(false);
        }
    };

    const filterGraphData = (sourceData: GraphData, hidden: Set<string>) => {
        const visibleNodes = sourceData.nodes.filter(n => !hidden.has(n.type));
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

        const visibleLinks = sourceData.links.filter(l => {
            const sourceId = typeof l.source === 'object' ? (l.source as Node).id : l.source;
            const targetId = typeof l.target === 'object' ? (l.target as Node).id : l.target;
            return visibleNodeIds.has(sourceId as string) && visibleNodeIds.has(targetId as string);
        });

        setFilteredData({ nodes: visibleNodes, links: visibleLinks });
    };

    useEffect(() => {
        filterGraphData(data, hiddenTypes);
    }, [data, hiddenTypes]);


    const handleRebuild = async () => {
        setRebuilding(true);
        try {
            await axios.post('/api/graph/rebuild');
            await fetchGraph();
            addToast("Graph rebuilt successfully!", 'success');
        } catch (error) {
            console.error("Failed to rebuild graph:", error);
            addToast("Failed to rebuild graph", 'error');
        } finally {
            setRebuilding(false);
        }
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            const res = await axios.post('/api/graph/analyze', { node_ids: [] });
            setConflicts(res.data.conflicts);
            if (res.data.conflicts.length === 0) {
                addToast("No conflicts detected", 'success');
            } else {
                addToast(`${res.data.conflicts.length} conflicts detected`, 'error');
            }
        } catch (error) {
            console.error("Failed to analyze graph:", error);
            addToast("Analysis failed", 'error');
        } finally {
            setAnalyzing(false);
        }
    };

    const fetchDossier = async (nodeId: string) => {
        setLoadingDossier(true);
        try {
            const res = await axios.get(`/api/graph/dossier/${nodeId}`);
            setDossierData(res.data);
            setIsDossierOpen(true);
        } catch (error) {
            console.error("Failed to fetch dossier:", error);
            addToast("Could not load dossier details", 'error');
        } finally {
            setLoadingDossier(false);
        }
    };

    // Trace the Trail Algorithm
    const traceTrail = (node: Node) => {
        const visitedNodes = new Set<string>();
        const visitedLinks = new Set<string>();

        const traverse = (currentNodeId: string) => {
            if (visitedNodes.has(currentNodeId)) return;
            visitedNodes.add(currentNodeId);

            const connectedLinks = data.links.filter(l =>
                (typeof l.source === 'object' ? (l.source as Node).id : l.source) === currentNodeId ||
                (typeof l.target === 'object' ? (l.target as Node).id : l.target) === currentNodeId
            );

            connectedLinks.forEach(link => {
                const sourceId = typeof link.source === 'object' ? (link.source as Node).id : link.source as string;
                const targetId = typeof link.target === 'object' ? (link.target as Node).id : link.target as string;

                const linkSig = `${sourceId}-${targetId}`;
                if (!visitedLinks.has(linkSig)) {
                    visitedLinks.add(linkSig);
                    const nextNodeId = sourceId === currentNodeId ? targetId : sourceId;
                    traverse(nextNodeId);
                }
            });
        };

        if (auditMode) {
            traverse(node.id);
            setHighlightedNodes(visitedNodes);
            setHighlightedLinks(visitedLinks);
            setSelectedNode(node);
        } else {
            setSelectedNode(node);
            setHighlightedNodes(new Set());
            setHighlightedLinks(new Set());
        }
    };

    const handleSearch = (query: string) => {
        const targetNode = data.nodes.find(n => n.label.toLowerCase() === query.toLowerCase());
        if (targetNode && graphRef.current) {
            // Zoom to node
            graphRef.current.centerAt(targetNode.x, targetNode.y, 1000);
            graphRef.current.zoom(6, 2000);
            setSelectedNode(targetNode as Node);
            // Optionally trace it
            if (auditMode) traceTrail(targetNode);
        }
    };

    const handleFilterChange = (type: string, isVisible: boolean) => {
        const newHidden = new Set(hiddenTypes);
        if (isVisible) {
            newHidden.delete(type); // Visible means removed from hidden
        } else {
            newHidden.add(type);
        }
        setHiddenTypes(newHidden);
    };

    const handleBackgroundClick = () => {
        setSelectedNode(null);
        setHighlightedNodes(new Set());
        setHighlightedLinks(new Set());
    };

    useEffect(() => {
        fetchGraph();

        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.offsetWidth,
                    height: window.innerHeight - 240 // Adjusted for controls
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        // Delay initial measure to allow layout settling
        setTimeout(updateDimensions, 100);

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    useEffect(() => {
        if (graphRef.current) {
            // Apply custom forces
            graphRef.current.d3Force('charge').strength(-200);
            graphRef.current.d3Force('link').distance(100);
            // Add collision to prevent overlap
            // graphRef.current.d3Force('collide', d3.forceCollide(20)); // requires d3 import, skipping for now as charge should handle it
        }
    }, [data, auditMode]); // Re-apply when data changes or mode changes

    return (
        <Section title="Knowledge Map">
            <GraphControls
                onSearch={handleSearch}
                onFilterChange={(type, isVisible) => handleFilterChange(type, isVisible)}
                onRebuild={handleRebuild}
                onAnalyze={handleAnalyze}
                onToggleAudit={() => {
                    setAuditMode(!auditMode);
                    setHighlightedNodes(new Set());
                    setHighlightedLinks(new Set());
                }}
                onOpenHelp={() => setIsHelpOpen(true)}
                isRebuilding={rebuilding}
                isAnalyzing={analyzing}
                isAuditMode={auditMode}
                conflictCount={conflicts.length}
                nodes={data.nodes}
                availableTypes={availableTypes}
            />

            {conflicts.length > 0 && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-fade-in">
                    <h3 className="text-red-800 dark:text-red-400 font-semibold mb-2">Conflicts Detected ({conflicts.length})</h3>
                    <div className="space-y-2 max-h-40 overflow-auto">
                        {conflicts.map((c, i) => (
                            <div key={i} className="text-sm text-red-700 dark:text-red-300 flex items-start gap-2">
                                <span className="font-bold">⚠️</span>
                                <span>{c.description}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <DossierPanel
                isOpen={isDossierOpen}
                onClose={() => setIsDossierOpen(false)}
                data={dossierData}
                isLoading={loadingDossier}
            />

            <GraphHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

            <div className="flex gap-6 h-[calc(100vh-220px)] animate-fade-in relative">
                <Card className="flex-1 p-0 overflow-hidden relative border border-gray-200 dark:border-gray-800 shadow-xl bg-gray-50/50 dark:bg-gray-900/50">
                    {!loading ? (
                        <div ref={containerRef} className="w-full h-full">
                            <ForceGraph2D
                                ref={graphRef}
                                width={dimensions.width}
                                height={dimensions.height}
                                graphData={filteredData}
                                nodeLabel="label"
                                d3AlphaDecay={0.02}
                                d3VelocityDecay={0.3}
                                cooldownTicks={100}
                                onEngineStop={() => graphRef.current.zoomToFit(400)}
                                nodeColor={(node: any) => {
                                    if (auditMode && highlightedNodes.size > 0 && !highlightedNodes.has(node.id)) {
                                        return '#e5e7eb'; // Gray out non-highlighted nodes
                                    }
                                    return node.color;
                                }}
                                nodeRelSize={6}
                                linkDirectionalArrowLength={3.5}
                                linkDirectionalArrowRelPos={1}
                                linkCurvature={0.25}
                                linkColor={(link: any) => {
                                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;

                                    const isConflict = conflicts.some(c =>
                                        (c.source_id === sourceId && c.target_id === targetId) ||
                                        (c.source_id === targetId && c.target_id === sourceId)
                                    );

                                    if (isConflict) return '#EF4444';

                                    if (auditMode && highlightedLinks.size > 0) {
                                        const linkSig = `${sourceId}-${targetId}`;
                                        const linkSigRev = `${targetId}-${sourceId}`;
                                        if (highlightedLinks.has(linkSig) || highlightedLinks.has(linkSigRev)) return '#0071E3';
                                        return '#e5e7eb';
                                    }
                                    return '#9CA3AF';
                                }}
                                linkWidth={(link: any) => {
                                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;

                                    const isConflict = conflicts.some(c =>
                                        (c.source_id === sourceId && c.target_id === targetId) ||
                                        (c.source_id === targetId && c.target_id === sourceId)
                                    );
                                    if (isConflict) return 3;

                                    if (auditMode && highlightedLinks.size > 0) {
                                        const linkSig = `${sourceId}-${targetId}`;
                                        const linkSigRev = `${targetId}-${sourceId}`;
                                        if (highlightedLinks.has(linkSig) || highlightedLinks.has(linkSigRev)) return 2;
                                    }
                                    return 1;
                                }}
                                onNodeClick={traceTrail}
                                onBackgroundClick={handleBackgroundClick}
                                nodeCanvasObject={(node: any, ctx, globalScale) => {
                                    if (auditMode && highlightedNodes.size > 0 && !highlightedNodes.has(node.id)) {
                                        const radius = 3;
                                        ctx.beginPath();
                                        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                                        ctx.fillStyle = '#e5e7eb';
                                        ctx.fill();
                                        return;
                                    }

                                    const label = node.label;
                                    const fontSize = 10 / globalScale;
                                    ctx.font = `${fontSize}px Inter, Sans-Serif`;
                                    const displayLabel = truncateLabel(label);
                                    const textWidth = ctx.measureText(displayLabel).width;
                                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4);

                                    if (node.x && node.y) {
                                        ctx.beginPath();
                                        const radius = 4; // Slightly larger for better visibility
                                        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                                        ctx.fillStyle = node.color;
                                        ctx.fill();

                                        ctx.strokeStyle = '#fff';
                                        ctx.lineWidth = 1.5 / globalScale;
                                        ctx.stroke();

                                        const textYOffset = 8;
                                        const isDarkMode = theme === 'dark';

                                        // Label Background
                                        ctx.fillStyle = isDarkMode ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)';
                                        ctx.fillRect(
                                            node.x - bckgDimensions[0] / 2,
                                            node.y + textYOffset - bckgDimensions[1] / 2 + 2,
                                            bckgDimensions[0],
                                            bckgDimensions[1]
                                        );

                                        // Label Text
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'middle';
                                        ctx.fillStyle = isDarkMode ? '#E5E5E5' : '#1D1D1F';
                                        const displayLabel = truncateLabel(label);
                                        ctx.fillText(displayLabel, node.x, node.y + textYOffset + 2);
                                    }
                                }}
                                // Add link labels on hover if desired, or just relationship
                                linkLabel="relation"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400 gap-3">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                            Loading Knowledge Graph...
                        </div>
                    )}
                </Card>

                {/* Side Panel for Node Details */}
                <div className="w-80 flex flex-col gap-4">
                    <Card className="p-6 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-100 dark:border-gray-700 h-full text-gray-900 dark:text-gray-100">
                        <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-white mb-4">Node Details</h3>
                        {selectedNode ? (
                            <div className="space-y-4 animate-fade-in">
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Name</div>
                                    <div className="font-medium text-lg">{selectedNode.label}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Type</div>
                                    <Badge color={
                                        selectedNode.type === 'document' ? 'primary' :
                                            selectedNode.type === 'issuer' ? 'success' :
                                                selectedNode.type === 'category' ? 'warning' :
                                                    selectedNode.type === 'tag' ? 'danger' :
                                                        'default'
                                    }>
                                        {selectedNode.type}
                                    </Badge>
                                </div>

                                <Button
                                    onClick={() => fetchDossier(selectedNode.id)}
                                    className="w-full flex items-center justify-center gap-2"
                                    title="View full details and history for this entity"
                                >
                                    <BookOpen className="w-4 h-4" />
                                    View Dossier
                                </Button>

                                {selectedNode.properties && Object.keys(selectedNode.properties).length > 0 && (
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Properties</div>
                                        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm text-gray-600 dark:text-gray-400 overflow-auto max-h-60 space-y-2">
                                            {selectedNode.properties.summary && (
                                                <div className="mb-2 border-b border-gray-200 dark:border-gray-800 pb-2">
                                                    <span className="font-semibold block text-xs mb-1">Summary</span>
                                                    {selectedNode.properties.summary}
                                                </div>
                                            )}
                                            {selectedNode.properties.priority && (
                                                <div className="flex justify-between">
                                                    <span className="font-semibold text-xs">Priority</span>
                                                    <Badge color={selectedNode.properties.priority >= 8 ? 'danger' : selectedNode.properties.priority >= 5 ? 'warning' : 'success'}>
                                                        {selectedNode.properties.priority}/10
                                                    </Badge>
                                                </div>
                                            )}
                                            {Object.entries(selectedNode.properties).map(([key, value]) => {
                                                if (['summary', 'priority'].includes(key)) return null;
                                                if (value === null || typeof value === 'object') return null;

                                                return (
                                                    <div key={key} className="flex justify-between border-b border-gray-100 dark:border-gray-800 py-1 last:border-0">
                                                        <span className="font-medium text-xs capitalize">{key.replace('_', ' ')}</span>
                                                        <span className="text-right truncate max-w-[150px]">{String(value)}</span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-gray-400 text-sm text-center mt-10">
                                Select a node to view details
                            </div>
                        )}
                    </Card>
                    <Card className="p-4 bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 border border-blue-100 dark:border-gray-700">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-400 mb-2 text-sm">Legend</h4>
                        <div className="space-y-2 text-sm text-gray-800 dark:text-gray-300">
                            {availableTypes.length > 0 ? availableTypes.map(type => (
                                <div key={type} className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: stringToColor(type) }}></span>
                                    <span className="capitalize">{type}</span>
                                </div>
                            )) : <span className="text-gray-400 italic">No types detected</span>}
                        </div>
                    </Card>

                    {auditMode && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded text-sm text-blue-800 dark:text-blue-300 animate-slide-in">
                            <strong>Audit Mode Active</strong>
                            <p className="mt-1">Click any node to trace its connections and lineage.</p>
                        </div>
                    )}
                </div>
            </div>
        </Section>
    );
};
export default GraphView;
