import type { Context } from 'hono';
import type { Agent, RouterAgent, AgentInfoNode } from '@taupo/ai';
import { createAgentUIStreamResponse } from '@taupo/ai';
import type { AgentsListResponse, AgentListItem } from './types';
import {
    agentNotFound,
    invalidRequestBody,
    agentExecutionError,
} from './utils/error-handler';
import { handleStreamResponse } from './utils/stream-handler';

/**
 * GET /agents
 * Returns a list of all registered agents with basic information.
 *
 * @param c - Hono context
 * @param agents - Map of registered agents
 * @returns JSON response with agents array
 */
export async function listAgentsHandler(
    c: Context,
    agents: Map<string, Agent<any, any, any> | RouterAgent<any>>,
) {
    const agentList: AgentListItem[] = Array.from(agents.values()).map(
        agent => {
            const tree = agent.getAgentTree();
            return {
                name: agent.info.name,
                capabilities: agent.info.capabilities,
                type: tree.type,
                model: agent.info.model,
            };
        },
    );

    const response: AgentsListResponse = {
        agents: agentList,
    };

    return c.json(response);
}

/**
 * GET /agent/:name/metadata
 * Returns detailed metadata for a specific agent.
 * Includes the full agent tree (with sub-agents for RouterAgents).
 *
 * @param c - Hono context
 * @param agents - Map of registered agents
 * @returns JSON response with agent metadata or 404 if not found
 */
export async function agentMetadataHandler(
    c: Context,
    agents: Map<string, Agent<any, any, any> | RouterAgent<any>>,
) {
    const agentName = c.req.param('name');
    const agent = agents.get(agentName);

    if (!agent) {
        return agentNotFound(c, agentName);
    }

    const tree: AgentInfoNode = agent.getAgentTree();
    return c.json(tree);
}

/**
 * POST /agent/:name/generate
 * Executes an agent in generate mode (non-streaming).
 * Expects request body in AI SDK format: { prompt?, messages?, options? }
 *
 * @param c - Hono context
 * @param agents - Map of registered agents
 * @returns JSON response with generation result or error
 */
export async function agentGenerateHandler(
    c: Context,
    agents: Map<string, Agent<any, any, any> | RouterAgent<any>>,
) {
    const agentName = c.req.param('name');
    const agent = agents.get(agentName);

    if (!agent) {
        return agentNotFound(c, agentName);
    }

    try {
        const body = await c.req.json();

        if (!body.prompt && !body.messages) {
            return invalidRequestBody(
                c,
                'Request must include either "prompt" or "messages" field',
            );
        }

        const result = await agent.generate(body);

        return c.json(result);
    } catch (error) {
        if (error instanceof SyntaxError) {
            return invalidRequestBody(c, 'Invalid JSON in request body');
        }

        return agentExecutionError(c, error);
    }
}

/**
 * POST /agent/:name/stream
 * Executes an agent in stream mode.
 * Expects request body in AI SDK format: { prompt?, messages?, options? }
 * Returns a Server-Sent Events stream.
 *
 * @param c - Hono context
 * @param agents - Map of registered agents
 * @returns SSE stream response or error
 */
export async function agentStreamHandler(
    c: Context,
    agents: Map<string, Agent<any, any, any> | RouterAgent<any>>,
) {
    const agentName = c.req.param('name');
    const agent = agents.get(agentName);

    if (!agent) {
        return agentNotFound(c, agentName);
    }

    try {
        const body = await c.req.json();

        if (!body.prompt && !body.messages) {
            return invalidRequestBody(
                c,
                'Request must include either "prompt" or "messages" field',
            );
        }

        const streamResult = await agent.stream(body);

        return handleStreamResponse(c, streamResult);
    } catch (error) {
        if (error instanceof SyntaxError) {
            return invalidRequestBody(c, 'Invalid JSON in request body');
        }

        return agentExecutionError(c, error);
    }
}

/**
 * POST /agent/:name/chat
 * Executes an agent in UI streaming mode for Vercel AI SDK UI compatibility.
 * Expects request body with UIMessages: { messages: [...] }
 * Returns a Vercel AI SDK UI-compatible stream.
 *
 * This endpoint is designed for frontends using useChat() or similar hooks.
 *
 * @param c - Hono context
 * @param agents - Map of registered agents
 * @returns UI stream response or error
 */
export async function agentChatHandler(
    c: Context,
    agents: Map<string, Agent<any, any, any> | RouterAgent<any>>,
) {
    const agentName = c.req.param('name');
    const agent = agents.get(agentName);

    if (!agent) {
        return agentNotFound(c, agentName);
    }

    try {
        const body = await c.req.json();

        if (!body.messages || !Array.isArray(body.messages)) {
            return invalidRequestBody(
                c,
                'Request must include "messages" array',
            );
        }

        return await createAgentUIStreamResponse({
            agent,
            messages: body.messages,
            maxMessagesInContext: body.maxMessagesInContext,
        });
    } catch (error) {
        if (error instanceof SyntaxError) {
            return invalidRequestBody(c, 'Invalid JSON in request body');
        }

        return agentExecutionError(c, error);
    }
}
