import React, { useEffect, useState, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Section } from './ui/Section';
import Card from './ui/Card';
import { Badge } from './ui/Badge';

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

    useEffect(() => {
        const fetchGraph = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/graph/data');
                const graphData = await res.json();

                // Process data for visualization
                const nodes = graphData.nodes.map((n: any) => ({
                    ...n,
                    val: n.type === 'document' ? 10 : n.type === 'issuer' ? 15 : 8,
                    color: n.type === 'document' ? '#0071E3' : n.type === 'issuer' ? '#34C759' : '#AF52DE'
                }));

                setData({ nodes, links: graphData.links });
            } catch (error) {
                console.error("Failed to fetch graph data:", error);
            } finally {
                setLoading(false);
            }
        };

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
            <div className="flex gap-6 h-[calc(100vh-180px)] animate-fade-in">
                <Card className="flex-1 p-0 overflow-hidden relative border border-gray-200 dark:border-gray-800 shadow-xl bg-gray-50/50 dark:bg-gray-900/50">
                    {!loading ? (
                        <div ref={containerRef} className="w-full h-full">
                            <ForceGraph2D
                                width={dimensions.width}
                                height={dimensions.height}
                                graphData={data}
                                nodeLabel="label"
                                nodeColor="color"
                                nodeRelSize={6}
                                linkDirectionalArrowLength={3.5}
                                linkDirectionalArrowRelPos={1}
                                linkCurvature={0.25}
                                onNodeClick={(node) => setSelectedNode(node as Node)}
                                // Custom canvas rendering for premium feel
                                nodeCanvasObject={(node: any, ctx, globalScale) => {
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
                                {selectedNode.properties && (
                                    <div>
                                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Properties</div>
                                        <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-sm font-mono text-gray-600 dark:text-gray-400 overflow-auto max-h-40">
                                            {JSON.stringify(selectedNode.properties, null, 2)}
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
                            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#AF52DE]"></span> Person</div>
                        </div>
                    </Card>
                </div>
            </div>
        </Section>
    );
};

export default GraphView;
