import type { Agent, RouterAgent } from '@taupo/ai';
import type { MiddlewareHandler } from 'hono';

/**
 * Configuration options for creating a Taupo server instance.
 */
export interface TaupoConfig {
    /**
     * Record of agents to register with the server.
     * The key will be used as the URL path segment for the agent.
     * Each agent will be accessible at `/agent/{key}/*`
     *
     * @example
     * ```typescript
     * const server = new Taupo({
     *   agents: {
     *     invoice: invoiceAgent,      // /agent/invoice/*
     *     customer: customerAgent,    // /agent/customer/*
     *     router: routerAgent,        // /agent/router/*
     *   }
     * });
     * ```
     */
    agents: Record<string, Agent<any, any, any> | RouterAgent<any>>;

    /**
     * Optional array of Hono middleware to apply to all routes.
     * Middleware is executed in the order provided.
     *
     * @example
     * ```typescript
     * const server = new Taupo({
     *   agents: { myAgent },
     *   middleware: [authMiddleware, loggingMiddleware]
     * });
     * ```
     */
    middleware?: Array<MiddlewareHandler>;
}

/**
 * Basic information about a registered agent.
 * Used in the GET /agents endpoint response.
 */
export interface AgentListItem {
    /**
     * URL-safe key/identifier for the agent (used in API routes)
     */
    key: string;

    /**
     * Display name of the agent
     */
    name: string;

    /**
     * Description of what the agent can do
     */
    capabilities: string;

    /**
     * Type of agent: 'agent' for basic agents, 'router' for routing agents
     */
    type: 'agent' | 'router';

    /**
     * Model ID if available
     */
    model?: string;
}

/**
 * Response format for GET /agents endpoint
 */
export interface AgentsListResponse {
    /**
     * Array of all registered agents
     */
    agents: AgentListItem[];
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
    /**
     * HTTP status code
     */
    status: number;

    /**
     * Error message
     */
    error: string;

    /**
     * Optional additional details
     */
    details?: string;
}
