import type { Context } from 'hono';
import type { Agent, RouterAgent, AgentInfoNode } from '@taupo/ai';
import { createAgentUIStreamResponse } from '@taupo/ai';
import type {
    AgentsListResponse,
    AgentListItem,
    TaupoAgentConfiguration,
} from './types';
import {
    agentNotFound,
    invalidRequestBody,
    agentExecutionError,
} from './utils/error-handler';
import { handleStreamResponse } from './utils/stream-handler';

function getAgent(
    entry: Agent<any, any, any> | RouterAgent<any> | TaupoAgentConfiguration,
) {
    if ('generate' in entry && typeof (entry as any).generate === 'function') {
        return entry as Agent<any, any, any> | RouterAgent<any>;
    }
    return (entry as TaupoAgentConfiguration).agent;
}

/**
 * GET /agents
 * Returns a list of all registered agents with basic information.
 *
 * @param ctx - Hono context
 * @param agents - Map of registered agents
 * @returns JSON response with agents array
 */
export async function listAgentsHandler(
    ctx: Context,
    agents: Map<
        string,
        Agent<any, any, any> | RouterAgent<any> | TaupoAgentConfiguration
    >,
) {
    const agentList: AgentListItem[] = Array.from(agents.entries()).map(
        ([key, entry]) => {
            const agent = getAgent(entry);
            const tree: AgentInfoNode = agent.getAgentTree();
            return {
                ...tree,
                key,
            };
        },
    );

    const response: AgentsListResponse = {
        agents: agentList,
    };

    return ctx.json(response);
}

/**
 * GET /agent/:name/metadata
 * Returns detailed metadata for a specific agent.
 * Includes the full agent tree (with sub-agents for RouterAgents).
 *
 * @param ctx - Hono context
 * @param agents - Map of registered agents
 * @returns JSON response with agent metadata or 404 if not found
 */
export async function agentMetadataHandler(
    ctx: Context,
    agents: Map<
        string,
        Agent<any, any, any> | RouterAgent<any> | TaupoAgentConfiguration
    >,
) {
    const agentName = ctx.req.param('name');
    const entry = agents.get(agentName);

    if (!entry) {
        return agentNotFound(ctx, agentName);
    }

    const agent = getAgent(entry);
    const tree: AgentInfoNode = agent.getAgentTree();
    return ctx.json(tree);
}

/**
 * POST /agent/:name/generate
 * Executes an agent in generate mode (non-streaming).
 * Expects request body in AI SDK format: { prompt?, messages?, options? }
 *
 * @param ctx - Hono context
 * @param agents - Map of registered agents
 * @returns JSON response with generation result or error
 */
export async function agentGenerateHandler(
    ctx: Context,
    agents: Map<
        string,
        Agent<any, any, any> | RouterAgent<any> | TaupoAgentConfiguration
    >,
) {
    const agentName = ctx.req.param('name');
    const entry = agents.get(agentName);

    if (!entry) {
        return agentNotFound(ctx, agentName);
    }

    const agent = getAgent(entry);

    try {
        const body = await ctx.req.json();

        if (!body.prompt && !body.messages) {
            return invalidRequestBody(
                ctx,
                'Request must include either "prompt" or "messages" field',
            );
        }

        const result = await agent.generate(body);

        return ctx.json(result);
    } catch (error) {
        if (error instanceof SyntaxError) {
            return invalidRequestBody(ctx, 'Invalid JSON in request body');
        }

        return agentExecutionError(ctx, error);
    }
}

/**
 * POST /agent/:name/stream
 * Executes an agent in stream mode.
 * Expects request body in AI SDK format: { prompt?, messages?, options? }
 * Returns a Server-Sent Events stream.
 *
 * @param ctx - Hono context
 * @param agents - Map of registered agents
 * @returns SSE stream response or error
 */
export async function agentStreamHandler(
    ctx: Context,
    agents: Map<
        string,
        Agent<any, any, any> | RouterAgent<any> | TaupoAgentConfiguration
    >,
) {
    const agentName = ctx.req.param('name');
    const entry = agents.get(agentName);

    if (!entry) {
        return agentNotFound(ctx, agentName);
    }

    const agent = getAgent(entry);

    try {
        const body = await ctx.req.json();

        if (!body.prompt && !body.messages) {
            return invalidRequestBody(
                ctx,
                'Request must include either "prompt" or "messages" field',
            );
        }

        const streamResult = await agent.stream(body);

        return handleStreamResponse(ctx, streamResult);
    } catch (error) {
        if (error instanceof SyntaxError) {
            return invalidRequestBody(ctx, 'Invalid JSON in request body');
        }

        return agentExecutionError(ctx, error);
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
 * @param ctx - Hono context
 * @param agents - Map of registered agents
 * @returns UI stream response or error
 */
export async function agentChatHandler(
    ctx: Context,
    agents: Map<
        string,
        Agent<any, any, any> | RouterAgent<any> | TaupoAgentConfiguration
    >,
) {
    const agentName = ctx.req.param('name');
    const entry = agents.get(agentName);

    if (!entry) {
        return agentNotFound(ctx, agentName);
    }

    const agent = getAgent(entry);
    const uiStreamOptions =
        'uiStreamOptions' in entry ? entry.uiStreamOptions : {};

    try {
        const body = await ctx.req.json();

        if (!body.messages || !Array.isArray(body.messages)) {
            return invalidRequestBody(
                ctx,
                'Request must include "messages" array',
            );
        }

        const context =
            typeof uiStreamOptions.context === 'function'
                ? uiStreamOptions.context(ctx)
                : uiStreamOptions.context;

        return await createAgentUIStreamResponse({
            agent,
            messages: body.messages,
            maxMessagesInContext: body.maxMessagesInContext,
            ...uiStreamOptions,
            context,
        });
    } catch (error) {
        if (error instanceof SyntaxError) {
            return invalidRequestBody(ctx, 'Invalid JSON in request body');
        }

        return agentExecutionError(ctx, error);
    }
}
