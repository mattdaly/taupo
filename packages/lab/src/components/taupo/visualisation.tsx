import { useMemo } from 'react';
import { nanoid } from 'nanoid';
import { BaseEdge, type EdgeProps, getBezierPath } from '@xyflow/react';
import { AgentInfoNode } from '@taupo/ai';
import {
    Canvas,
    Node,
    NodeDescription,
    NodeFooter,
    NodeHeader,
    NodeTitle,
} from '@/components/ai-elements/workflow';

interface VisualisationProps {
    agentTree: AgentInfoNode | null;
}

interface LayoutNode {
    id: string;
    node: AgentInfoNode | null; // null for tool nodes
    level: number;
    parentId?: string;
    type: 'agent' | 'tool';
    toolName?: string; // only for tool nodes
}

function buildLayout(
    tree: AgentInfoNode,
    level = 0,
    parentId?: string,
): LayoutNode[] {
    const id = nanoid();
    const current: LayoutNode = {
        id,
        node: tree,
        level,
        parentId,
        type: 'agent',
    };

    // Process sub-agents
    const subAgentChildren =
        tree.subAgents?.flatMap(child => buildLayout(child, level + 1, id)) ??
        [];

    // Process tools as child nodes
    const toolChildren =
        tree.tools?.map(toolName => ({
            id: nanoid(),
            node: null,
            level: level + 1,
            parentId: id,
            type: 'tool' as const,
            toolName,
        })) ?? [];

    return [current, ...subAgentChildren, ...toolChildren];
}

function calculatePositions(layoutNodes: LayoutNode[]) {
    const HORIZONTAL_SPACING = 400;
    const VERTICAL_SPACING = 135; // For agents
    const TOOL_VERTICAL_SPACING = 46; // For tools (changed to force refresh)
    const AGENT_NODE_HEIGHT = 110; // Approximate height of agent nodes
    const TOOL_NODE_HEIGHT = 40; // Approximate height of tool nodes
    const positions = new Map<string, { x: number; y: number }>();

    // Create a map of parent to children
    const childrenMap = new Map<string, LayoutNode[]>();
    layoutNodes.forEach(node => {
        if (node.parentId) {
            const siblings = childrenMap.get(node.parentId) || [];
            siblings.push(node);
            childrenMap.set(node.parentId, siblings);
        }
    });

    // Calculate height of a subtree
    function calculateSubtreeHeight(node: LayoutNode): number {
        const children = childrenMap.get(node.id) || [];
        if (children.length === 0) {
            // Leaf node - use smaller spacing for tools
            return node.type === 'tool'
                ? TOOL_VERTICAL_SPACING
                : VERTICAL_SPACING;
        }

        let totalHeight = 0;
        children.forEach(child => {
            totalHeight += calculateSubtreeHeight(child);
        });

        // Ensure minimum height for agents to prevent overlap
        // Agent nodes are ~120px tall, so we need at least that much space
        if (node.type === 'agent') {
            return Math.max(totalHeight, VERTICAL_SPACING);
        }

        return totalHeight;
    }

    // Recursive function to position nodes (children centered on parent)
    function positionNode(node: LayoutNode, x: number, y: number): void {
        // Position this node
        positions.set(node.id, { x, y });

        // Get children
        const children = childrenMap.get(node.id) || [];
        if (children.length === 0) {
            return;
        }

        // Calculate actual space needed for children (without minimum constraints)
        let actualChildHeight = 0;
        const childSpacings: number[] = [];

        children.forEach(child => {
            const spacing =
                child.type === 'tool'
                    ? TOOL_VERTICAL_SPACING
                    : VERTICAL_SPACING;
            childSpacings.push(spacing);
            actualChildHeight += spacing;
        });

        // Calculate the visual center of the parent node
        const parentNodeHeight =
            node.type === 'tool' ? TOOL_NODE_HEIGHT : AGENT_NODE_HEIGHT;
        const parentVisualCenterY = y + parentNodeHeight / 2;

        // Position children centered around parent's VISUAL center
        const startY = parentVisualCenterY - actualChildHeight / 2;
        let currentY = startY;

        children.forEach((child, index) => {
            const childNodeHeight =
                child.type === 'tool' ? TOOL_NODE_HEIGHT : AGENT_NODE_HEIGHT;
            // Position child so its visual center is at the target Y
            const childVisualCenterY = currentY + childSpacings[index] / 2;
            const childTopY = childVisualCenterY - childNodeHeight / 2;

            positionNode(child, x + HORIZONTAL_SPACING, childTopY);
            currentY += childSpacings[index];
        });
    }

    // Find root node and position from there
    const root = layoutNodes.find(node => !node.parentId);
    if (root) {
        positionNode(root, 0, 0);
    }

    return positions;
}

const nodeTypes = {
    agent: ({
        data,
    }: {
        data: {
            label: string;
            description: string;
            model?: string;
            isRouter: boolean;
            handles: { target: boolean; source: boolean };
        };
    }) => (
        <Node
            handles={data.handles}
            className={
                data.isRouter
                    ? 'border-l-4 border-l-blue-500'
                    : 'border-l-4 border-l-green-500'
            }
        >
            <NodeHeader className="py-3.5 px-5">
                <NodeTitle>{data.label}</NodeTitle>
                <NodeDescription
                    className={
                        data.isRouter ? 'text-blue-700' : 'text-green-700'
                    }
                >
                    {data.description}
                </NodeDescription>
            </NodeHeader>
            {data.model && (
                <NodeFooter className="py-3 px-5">
                    <p className="text-xs text-gray-900">{data.model}</p>
                </NodeFooter>
            )}
        </Node>
    ),
    tool: ({
        data,
    }: {
        data: {
            label: string;
            handles: { target: boolean; source: boolean };
        };
    }) => (
        <Node
            handles={data.handles}
            className="bg-white py-2 px-2.5 border-l-4 border-l-amber-500"
        >
            <NodeTitle className="font-normal text-xs">{data.label}</NodeTitle>
        </Node>
    ),
};

const StaticEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
}: EdgeProps) => {
    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });
    return <BaseEdge id={id} path={edgePath} />;
};

const edgeTypes = {
    static: StaticEdge,
};

function Visualisation({ agentTree }: VisualisationProps) {
    const { nodes, edges } = useMemo(() => {
        if (!agentTree) {
            return { nodes: [], edges: [] };
        }

        const layoutNodes = buildLayout(agentTree);
        const positions = calculatePositions(layoutNodes);

        const nodes = layoutNodes.map(
            ({ id, node, parentId, type, toolName }) => {
                const position = positions.get(id) || { x: 0, y: 0 };
                const hasChildren =
                    (node?.subAgents && node.subAgents.length > 0) ||
                    (node?.tools && node.tools.length > 0);
                const hasParent = !!parentId;

                // Handle tool nodes
                if (type === 'tool') {
                    return {
                        id,
                        type: 'tool',
                        position,
                        width: 288,
                        data: {
                            label: toolName!,
                            handles: { target: hasParent, source: false },
                        },
                    };
                }

                // Handle agent nodes
                const isRouter = node!.type === 'router';

                let description: string;
                if (isRouter) {
                    description = `Router (${node!.subAgents?.length || 0} sub-agents)`;
                } else if (node!.tools && node!.tools.length > 0) {
                    description = `Agent (${node!.tools.length} ${node!.tools.length === 1 ? 'tool' : 'tools'})`;
                } else {
                    description = 'Agent';
                }

                return {
                    id,
                    type: 'agent',
                    position,
                    width: 288, // w-72 = 18rem = 288px
                    data: {
                        label: node!.name,
                        description,
                        model: node!.model,
                        isRouter,
                        handles: { target: hasParent, source: hasChildren },
                    },
                };
            },
        );

        const edges = layoutNodes
            .filter(node => node.parentId)
            .map(node => ({
                id: nanoid(),
                source: node.parentId!,
                target: node.id,
                type: 'static',
            }));

        return { nodes, edges };
    }, [agentTree]);

    if (!agentTree) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-2">
                    <p className="text-lg text-muted-foreground">
                        Agent metadata not available
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Connect to an agent to view its structure
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full">
            <Canvas
                edges={edges}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.2, maxZoom: 0.8 }}
                minZoom={0.05}
                maxZoom={1.5}
                nodes={nodes}
                nodeTypes={nodeTypes}
            />
        </div>
    );
}

export default Visualisation;
