import { Hono } from 'hono';
import type { Agent, RouterAgent } from '@taupo/ai';
import type { TaupoConfig } from './types';
import {
    listAgentsHandler,
    agentMetadataHandler,
    agentGenerateHandler,
    agentStreamHandler,
    agentChatHandler,
} from './routes';

/**
 * Taupo - A Hono-based HTTP server for AI agents.
 *
 * Taupo wraps Hono and automatically generates REST endpoints for registered agents.
 * It provides a clean API for consumers to export a fully-fledged HTTP server
 * with built-in agent endpoints.
 *
 * @example
 * ```typescript
 * import { Taupo } from '@taupo/server';
 * import { myAgent, routerAgent } from './agents';
 * import { authMiddleware } from './middleware';
 *
 * const server = new Taupo({
 *   agents: {
 *     myAgent,
 *     router: routerAgent,
 *   },
 *   middleware: [authMiddleware],
 * });
 *
 * export default server; // Works as Cloudflare Worker
 * ```
 *
 * ## API Endpoints
 *
 * - `GET /agents` - List all registered agents
 * - `GET /agent/:name/metadata` - Get agent metadata
 * - `POST /agent/:name/generate` - Execute agent (non-streaming)
 * - `POST /agent/:name/stream` - Execute agent (direct streaming)
 * - `POST /agent/:name/chat` - Execute agent (UI streaming for Vercel AI SDK)
 */
export class Taupo {
    /**
     * Internal Hono app instance
     */
    private readonly app: Hono;

    /**
     * Registry of agents by name
     */
    private readonly agents: Map<
        string,
        Agent<any, any, any> | RouterAgent<any>
    >;

    /**
     * Fetch handler for the server.
     * This is the main entry point for handling HTTP requests.
     *
     * Can be directly exported for use in Cloudflare Workers, Deno Deploy, etc.
     *
     * @example
     * ```typescript
     * // Cloudflare Worker
     * export default server;
     *
     * // Or explicitly
     * export default {
     *   fetch: server.fetch.bind(server)
     * };
     * ```
     */
    public readonly fetch: (
        request: Request,
        ...args: any[]
    ) => Response | Promise<Response>;

    /**
     * Creates a new Taupo server instance.
     *
     * @param config - Configuration object with agents and optional middleware
     *
     * @example
     * ```typescript
     * const server = new Taupo({
     *   agents: {
     *     invoice: invoiceAgent,
     *     customer: customerAgent,
     *   },
     *   middleware: [authMiddleware, loggingMiddleware],
     * });
     * ```
     */
    constructor(config: TaupoConfig) {
        this.app = new Hono();
        this.agents = new Map();

        // Register agents and validate uniqueness
        this.registerAgents(config.agents);

        // Apply middleware if provided
        if (config.middleware && config.middleware.length > 0) {
            config.middleware.forEach(middleware => {
                this.app.use('*', middleware);
            });
        }

        // Setup all routes
        this.setupRoutes();

        // Bind fetch handler after app is fully initialized
        this.fetch = this.app.fetch.bind(this.app);
    }

    /**
     * Registers agents and builds the agent registry.
     * Uses the provided keys as the URL path names.
     *
     * @param agents - Record of agents to register (key = URL path name)
     */
    private registerAgents(
        agents: Record<string, Agent<any, any, any> | RouterAgent<any>>,
    ): void {
        for (const [key, agent] of Object.entries(agents)) {
            this.agents.set(key, agent);
        }
    }

    /**
     * Sets up all API routes.
     * Called during construction after agents are registered.
     */
    private setupRoutes(): void {
        // GET /agents - List all agents
        this.app.get('/agents', c => listAgentsHandler(c, this.agents));

        // GET /agent/:name/metadata - Get agent metadata
        this.app.get('/agent/:name/metadata', c =>
            agentMetadataHandler(c, this.agents),
        );

        // POST /agent/:name/generate - Execute agent (non-streaming)
        this.app.post('/agent/:name/generate', c =>
            agentGenerateHandler(c, this.agents),
        );

        // POST /agent/:name/stream - Execute agent (streaming)
        this.app.post('/agent/:name/stream', c =>
            agentStreamHandler(c, this.agents),
        );

        // POST /agent/:name/chat - Execute agent (UI streaming for Vercel AI SDK)
        this.app.post('/agent/:name/chat', c =>
            agentChatHandler(c, this.agents),
        );
    }
}
