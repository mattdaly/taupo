import { Background, ReactFlow, type ReactFlowProps } from '@xyflow/react';
import type { ConnectionLineComponent } from '@xyflow/react';
import type { ReactNode } from 'react';
import { Controls as ControlsPrimitive } from '@xyflow/react';
import type { ComponentProps } from 'react';
import '@xyflow/react/dist/style.css';
import { cn } from '@/lib/utils';
import {
    BaseEdge,
    type EdgeProps,
    getBezierPath,
    getSimpleBezierPath,
    type InternalNode,
    type Node as XYFlowNode,
    Position,
    useInternalNode,
    Handle,
    Panel as PanelPrimitive,
    NodeToolbar,
} from '@xyflow/react';

import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

type CanvasProps = ReactFlowProps & {
    children?: ReactNode;
};
export const Canvas = ({ children, ...props }: CanvasProps) => (
    <ReactFlow
        deleteKeyCode={['Backspace', 'Delete']}
        fitView
        panOnScroll
        selectionOnDrag={true}
        {...props}
    >
        <Background bgColor="#F5F5F5" />
        {children}
    </ReactFlow>
);

const HALF = 0.5;
export const Connection: ConnectionLineComponent = ({
    fromX,
    fromY,
    toX,
    toY,
}) => (
    <g>
        <path
            className="animated"
            d={`M${fromX},${fromY} C ${fromX + (toX - fromX) * HALF},${fromY} ${fromX + (toX - fromX) * HALF},${toY} ${toX},${toY}`}
            fill="none"
            stroke="#52C7AB"
            strokeWidth={1}
        />
        <circle
            cx={toX}
            cy={toY}
            fill="#fff"
            r={3}
            stroke="#52C7AB"
            strokeWidth={1}
        />
    </g>
);

export type ControlsProps = ComponentProps<typeof ControlsPrimitive>;
export const Controls = ({ className, ...props }: ControlsProps) => (
    <ControlsPrimitive
        className={cn(
            'gap-px overflow-hidden rounded-md border border-gray-300 bg-card p-1 shadow-none!',
            '[&>button]:rounded-md [&>button]:border-none! [&>button]:bg-transparent! [&>button]:hover:bg-gray-100!',
            className,
        )}
        {...props}
    />
);

const Temporary = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
}: EdgeProps) => {
    const [edgePath] = getSimpleBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });
    return (
        <BaseEdge
            className="stroke-1 stroke-gray-500"
            id={id}
            path={edgePath}
            style={{
                strokeDasharray: '5, 5',
            }}
        />
    );
};
const getHandleCoordsByPosition = (
    node: InternalNode<XYFlowNode>,
    handlePosition: Position,
) => {
    // Choose the handle type based on position - Left is for target, Right is for source
    const handleType = handlePosition === Position.Left ? 'target' : 'source';
    const handle = node.internals.handleBounds?.[handleType]?.find(
        h => h.position === handlePosition,
    );
    if (!handle) {
        return [0, 0] as const;
    }
    let offsetX = handle.width / 2;
    let offsetY = handle.height / 2;
    // this is a tiny detail to make the markerEnd of an edge visible.
    // The handle position that gets calculated has the origin top-left, so depending which side we are using, we add a little offset
    // when the handlePosition is Position.Right for example, we need to add an offset as big as the handle itself in order to get the correct position
    switch (handlePosition) {
        case Position.Left:
            offsetX = 0;
            break;
        case Position.Right:
            offsetX = handle.width;
            break;
        case Position.Top:
            offsetY = 0;
            break;
        case Position.Bottom:
            offsetY = handle.height;
            break;
        default:
            throw new Error(`Invalid handle position: ${handlePosition}`);
    }
    const x = node.internals.positionAbsolute.x + handle.x + offsetX;
    const y = node.internals.positionAbsolute.y + handle.y + offsetY;
    return [x, y] as const;
};
const getEdgeParams = (
    source: InternalNode<XYFlowNode>,
    target: InternalNode<XYFlowNode>,
) => {
    const sourcePos = Position.Right;
    const [sx, sy] = getHandleCoordsByPosition(source, sourcePos);
    const targetPos = Position.Left;
    const [tx, ty] = getHandleCoordsByPosition(target, targetPos);
    return {
        sx,
        sy,
        tx,
        ty,
        sourcePos,
        targetPos,
    };
};
const Animated = ({ id, source, target, markerEnd, style }: EdgeProps) => {
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);
    if (!(sourceNode && targetNode)) {
        return null;
    }
    const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(
        sourceNode,
        targetNode,
    );
    const [edgePath] = getBezierPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sourcePos,
        targetX: tx,
        targetY: ty,
        targetPosition: targetPos,
    });
    return (
        <>
            <BaseEdge
                id={id}
                markerEnd={markerEnd}
                path={edgePath}
                style={style}
            />
            <circle fill="#028465" r="4">
                <animateMotion
                    dur="3s"
                    path={edgePath}
                    repeatCount="indefinite"
                />
            </circle>
        </>
    );
};
export const Edge = {
    Temporary,
    Animated,
};

export type NodeProps = ComponentProps<typeof Card> & {
    handles: {
        target: boolean;
        source: boolean;
    };
};

export const Node = ({ handles, className, ...props }: NodeProps) => (
    <Card
        className={cn(
            'node-container relative size-full h-auto w-72 gap-0 rounded-md p-0',
            className,
        )}
        {...props}
    >
        {handles.target && <Handle position={Position.Left} type="target" />}
        {handles.source && <Handle position={Position.Right} type="source" />}
        {props.children}
    </Card>
);

export type NodeHeaderProps = ComponentProps<typeof CardHeader>;

export const NodeHeader = ({ className, ...props }: NodeHeaderProps) => (
    <CardHeader
        className={cn(
            'gap-0.5 rounded-t-md border-gray-300 border-b bg-white',
            className,
        )}
        {...props}
    />
);

export type NodeTitleProps = ComponentProps<typeof CardTitle>;

export const NodeTitle = (props: NodeTitleProps) => <CardTitle {...props} />;

export type NodeDescriptionProps = ComponentProps<typeof CardDescription>;

export const NodeDescription = (props: NodeDescriptionProps) => (
    <CardDescription {...props} />
);

export type NodeActionProps = ComponentProps<typeof CardAction>;

export const NodeAction = (props: NodeActionProps) => <CardAction {...props} />;

export type NodeContentProps = ComponentProps<typeof CardContent>;

export const NodeContent = ({ className, ...props }: NodeContentProps) => (
    <CardContent
        className={cn('p-3 [&_p]:!mb-0 bg-gray-100', className)}
        {...props}
    />
);

export type NodeFooterProps = ComponentProps<typeof CardFooter>;

export const NodeFooter = ({ className, ...props }: NodeFooterProps) => (
    <CardFooter
        className={cn(
            'rounded-b-md border-t border-gray-300 bg-gray-50 [&_p]:!mb-0',
            className,
        )}
        {...props}
    />
);
type PanelProps = ComponentProps<typeof PanelPrimitive>;
export const Panel = ({ className, ...props }: PanelProps) => (
    <PanelPrimitive
        className={cn(
            'm-4 overflow-hidden rounded-md border-gray-500 border bg-card p-1',
            className,
        )}
        {...props}
    />
);

type ToolbarProps = ComponentProps<typeof NodeToolbar>;
export const Toolbar = ({ className, ...props }: ToolbarProps) => (
    <NodeToolbar
        className={cn(
            'flex items-center gap-1 rounded-sm border-gray-300 border bg-background p-1.5',
            className,
        )}
        position={Position.Bottom}
        {...props}
    />
);
