/**
 * @taupo/taupo - A framework for building AI agents in TypeScript
 *
 * Taupo provides a Hono-based HTTP server that wraps AI agents,
 * automatically generating REST endpoints for agent execution.
 *
 * @packageDocumentation
 */

export { Taupo } from './server';
export type {
    TaupoConfig,
    AgentListItem,
    AgentsListResponse,
    ErrorResponse,
} from './types';

// Re-export everything from @taupo/ai for convenience
export * from '@taupo/ai';
