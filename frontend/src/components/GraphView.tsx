import React, { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Section } from './ui/Section';
import Card from './ui/Card';
import { Badge } from './ui/Badge';
import Button from './ui/Button';
import axios from 'axios';
import DossierPanel, { DossierData } from './DossierPanel';

interface Node {
    id: string;
    label: string;
    type: string;
    properties: any;
    val?: number;
    color?: string;
}

interface Link {
    source: string;
    target: string;
    relation: string;
}

interface GraphData {
    nodes: Node[];
    links: Link[];
}

const GraphView: React.FC = () => {
    const [data, setData] = useState<GraphData>({ nodes: [], links: [] });
    const [loading, setLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

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

    const fetchGraph = async () => {
        setLoading(true);
        try {
            // Use axios (global instance configured in AuthContext) for authentication
            const res = await axios.get('/api/graph/data');
            const graphData = res.data;

            // Process data for visualization
            const nodes = graphData.nodes.map((n: any) => {
                let val = 8;
                let color = '#AF52DE'; // Default purple

                switch (n.type) {
                    case 'document':
                        val = 15;
                        color = '#0071E3'; // Blue
                        break;
                    case 'issuer':
                        val = 12;
                        color = '#34C759'; // Green
                        break;
                    case 'category':
                        val = 10;
                        color = '#FF9500'; // Orange
                        break;
                    case 'tag':
                        val = 6;
                        color = '#FF2D55'; // Pink/Red
                        break;
                    case 'organization':
                        val = 10;
                        color = '#5856D6'; // Indigo
                        break;
                    case 'location':
                        val = 8;
                        color = '#5AC8FA'; // Light Blue
                        break;
                    case 'person':
                        val = 8;
                        color = '#AF52DE'; // Purple
                        break;
                }

                return {
                    ...n,
                    val,
                    color,
                    // Add extracted properties for easy access
                    properties: n.properties || {}
                };
            });

            setData({ nodes, links: graphData.links });
        } catch (error) {
            console.error("Failed to fetch graph data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRebuild = async () => {
        setRebuilding(true);
        try {
            await axios.post('/api/graph/rebuild');
            await fetchGraph();
        } catch (error) {
            console.error("Failed to rebuild graph:", error);
        } finally {
            setRebuilding(false);
        }
    };

    const handleAnalyze = async () => {
        setAnalyzing(true);
        try {
            const res = await axios.post('/api/graph/analyze', { node_ids: [] }); // Analyze all/top nodes
            setConflicts(res.data.conflicts);
            if (res.data.conflicts.length === 0) {
                alert("No conflicts detected.");
            }
        } catch (error) {
            console.error("Failed to analyze graph:", error);
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

            // Find all links connected to this node
            const connectedLinks = data.links.filter(l =>
                (typeof l.source === 'object' ? (l.source as any).id : l.source) === currentNodeId ||
                (typeof l.target === 'object' ? (l.target as any).id : l.target) === currentNodeId
            );

            connectedLinks.forEach(link => {
                const sourceId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                const targetId = typeof link.target === 'object' ? (link.target as any).id : link.target;

                // Add link to visited
                // We need a unique way to identify links, checking content for now
                // Ideally links have IDs, but here we just check if we processed this specific link object
                // Visited links logic depends on how we iterate. 
                // Since we don't have IDs on links easily, checking existence in 'connectedLinks' is partial.
                // We will create a signature.
                const linkSig = `${sourceId}-${targetId}`;
                if (!visitedLinks.has(linkSig)) {
                    visitedLinks.add(linkSig);
                    // Recursively traverse the OTHER node
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
            // Fetch dossier if it's an entity node (or even document node)
            fetchDossier(node.id);
        }
    };

    // Clear highlights when clicking background
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
                    height: window.innerHeight - 200
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    return (
        <Section title="Mind Map">
            <div className="flex justify-between mb-4">
                <div className="flex gap-2">
                    <Button
                        variant={auditMode ? 'primary' : 'secondary'}
                        onClick={() => {
                            setAuditMode(!auditMode);
                            setHighlightedNodes(new Set());
                            setHighlightedLinks(new Set());
                        }}
                    >
                        {auditMode ? 'Exit Audit Mode' : 'Trace The Trail'}
                    </Button>
                    <Button
                        variant={conflicts.length > 0 ? 'danger' : 'secondary'}
                        onClick={handleAnalyze}
                        disabled={analyzing}
                    >
                        {analyzing ? 'Analyzing...' : 'Conflict Search'}
                    </Button>
                </div>
                <Button onClick={handleRebuild} disabled={rebuilding}>
                    {rebuilding ? 'Rebuilding...' : 'Rebuild Graph'}
                </Button>
            </div>

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

            <div className="flex gap-6 h-[calc(100vh-180px)] animate-fade-in relative">
                <Card className="flex-1 p-0 overflow-hidden relative border border-gray-200 dark:border-gray-800 shadow-xl bg-gray-50/50 dark:bg-gray-900/50">
                    {!loading ? (
                        <div ref={containerRef} className="w-full h-full">
                            <ForceGraph2D
                                width={dimensions.width}
                                height={dimensions.height}
                                graphData={data}
                                nodeLabel="label"
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
                                    // Check for conflict
                                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;

                                    const isConflict = conflicts.some(c =>
                                        (c.source_id === sourceId && c.target_id === targetId) ||
                                        (c.source_id === targetId && c.target_id === sourceId)
                                    );

                                    if (isConflict) return '#EF4444'; // Red for conflict

                                    if (auditMode && highlightedLinks.size > 0) {
                                        const linkSig = `${sourceId}-${targetId}`;
                                        const linkSigRev = `${targetId}-${sourceId}`; // undirected check usually
                                        if (highlightedLinks.has(linkSig) || highlightedLinks.has(linkSigRev)) return '#0071E3'; // Blue for trace
                                        return '#e5e7eb'; // Fade others
                                    }
                                    return '#9CA3AF'; // Default gray
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
                                linkLineDash={(link: any) => {
                                    const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                                    const targetId = typeof link.target === 'object' ? link.target.id : link.target;

                                    const isConflict = conflicts.some(c =>
                                        (c.source_id === sourceId && c.target_id === targetId) ||
                                        (c.source_id === targetId && c.target_id === sourceId)
                                    );
                                    if (isConflict) return [3, 2]; // Jagged line
                                    return null;
                                }}
                                onNodeClick={traceTrail}
                                onBackgroundClick={handleBackgroundClick}
                                // Custom canvas rendering for premium feel
                                nodeCanvasObject={(node: any, ctx, globalScale) => {
                                    // Skip rendering label if in audit mode and not highlighted
                                    if (auditMode && highlightedNodes.size > 0 && !highlightedNodes.has(node.id)) {
                                        const radius = 3;
                                        ctx.beginPath();
                                        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                                        ctx.fillStyle = '#e5e7eb';
                                        ctx.fill();
                                        return;
                                    }

                                    const label = node.label;
                                    const fontSize = 10 / globalScale; // Slightly smaller font
                                    ctx.font = `${fontSize}px Inter, Sans-Serif`;
                                    const textWidth = ctx.measureText(label).width;
                                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4);

                                    if (node.x && node.y) {
                                        // Draw circle node first (reduced size)
                                        ctx.beginPath();
                                        const radius = 3; // Fixed, smaller radius
                                        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                                        ctx.fillStyle = node.color;
                                        ctx.fill();

                                        // Optional: Add a subtle glow or border
                                        ctx.strokeStyle = '#fff';
                                        ctx.lineWidth = 1 / globalScale;
                                        ctx.stroke();

                                        // Draw text label BELOW the node
                                        const textYOffset = 6; // Push text down

                                        // Check if dark mode is active (basic check via body class)
                                        const isDarkMode = document.documentElement.classList.contains('dark');

                                        // Text background
                                        ctx.fillStyle = isDarkMode ? 'rgba(30, 30, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)';
                                        ctx.fillRect(
                                            node.x - bckgDimensions[0] / 2,
                                            node.y + textYOffset - bckgDimensions[1] / 2 + 2,
                                            bckgDimensions[0],
                                            bckgDimensions[1]
                                        );

                                        // Text
                                        ctx.textAlign = 'center';
                                        ctx.textBaseline = 'middle';
                                        ctx.fillStyle = isDarkMode ? '#E5E5E5' : '#1D1D1F';
                                        ctx.fillText(label, node.x, node.y + textYOffset + 2);
                                    }
                                }}
                            />
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">Loading neural network...</div>
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
                                    <Badge color={selectedNode.type === 'document' ? 'primary' : selectedNode.type === 'issuer' ? 'success' : 'warning'}>
                                        {selectedNode.type}
                                    </Badge>
                                </div>

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
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#0071E3]"></span> Document</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#34C759]"></span> Issuer</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#FF9500]"></span> Category</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#5856D6]"></span> Organization</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#FF2D55]"></span> Tag</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#5AC8FA]"></span> Location</div>
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#AF52DE]"></span> Person</div>
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
