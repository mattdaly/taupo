import { describe, it, expect, beforeEach } from 'vitest';
import { Taupo } from '../src/server';
import { Agent, RouterAgent } from '@taupo/ai';
import type { AgentsListResponse, ErrorResponse } from '../src/types';

/**
 * Mock agent for testing purposes
 */
function createMockAgent(name: string, capabilities: string) {
    return new Agent({
        name,
        capabilities,
        model: 'test-model',
        instructions: 'Test instructions',
        tools: {
            testTool: {
                description: 'A test tool',
                inputSchema: {} as any,
                execute: async () => ({ result: 'test' }),
            },
        },
    });
}

/**
 * Mock router agent for testing purposes
 */
function createMockRouterAgent(name: string, subAgents: Agent[]) {
    return new RouterAgent({
        name,
        model: 'test-model',
        instructions: 'Test router instructions',
        subAgents,
    });
}

describe('Taupo Server', () => {
    describe('Constructor', () => {
        it('should create a server with agents', () => {
            const agent = createMockAgent('test-agent', 'Test capabilities');
            const server = new Taupo({
                agents: { testAgent: agent },
            });

            expect(server).toBeDefined();
            expect(server.fetch).toBeDefined();
        });

        it('should use object keys as URL path names', () => {
            const agent1 = createMockAgent('First Agent', 'First agent');
            const agent2 = createMockAgent('Second Agent', 'Second agent');

            const server = new Taupo({
                agents: {
                    first: agent1,
                    second: agent2,
                },
            });

            expect(server).toBeDefined();
        });

        it('should accept middleware', () => {
            const agent = createMockAgent('test-agent', 'Test capabilities');
            const middleware = async (c: any, next: any) => {
                await next();
            };

            const server = new Taupo({
                agents: { testAgent: agent },
                middleware: [middleware],
            });

            expect(server).toBeDefined();
        });
    });

    describe('GET /agents', () => {
        it('should list all registered agents', async () => {
            const agent1 = createMockAgent('agent1', 'First agent');
            const agent2 = createMockAgent('agent2', 'Second agent');
            const server = new Taupo({
                agents: {
                    firstAgent: agent1,
                    secondAgent: agent2,
                },
            });

            const response = await server.fetch(
                new Request('http://localhost/agents'),
            );
            const data = (await response.json()) as AgentsListResponse;

            expect(response.status).toBe(200);
            expect(data.agents).toHaveLength(2);
            expect(data.agents[0].name).toBe('agent1');
            expect(data.agents[0].type).toBe('agent');
            expect(data.agents[1].name).toBe('agent2');
        });

        it('should return empty array when no agents registered', async () => {
            const server = new Taupo({
                agents: {},
            });

            const response = await server.fetch(
                new Request('http://localhost/agents'),
            );
            const data = (await response.json()) as AgentsListResponse;

            expect(response.status).toBe(200);
            expect(data.agents).toHaveLength(0);
        });

        it('should distinguish between agent and router types', async () => {
            const subAgent = createMockAgent('sub-agent', 'Sub agent');
            const agent = createMockAgent('agent', 'Regular agent');
            const router = createMockRouterAgent('router', [subAgent]);

            const server = new Taupo({
                agents: {
                    regularAgent: agent,
                    routerAgent: router,
                },
            });

            const response = await server.fetch(
                new Request('http://localhost/agents'),
            );
            const data = (await response.json()) as AgentsListResponse;

            expect(response.status).toBe(200);
            expect(data.agents).toHaveLength(2);
            expect(data.agents.find(a => a.name === 'agent')?.type).toBe(
                'agent',
            );
            expect(data.agents.find(a => a.name === 'router')?.type).toBe(
                'router',
            );
        });
    });

    describe('GET /agent/:name/metadata', () => {
        it('should return metadata for existing agent', async () => {
            const agent = createMockAgent('test-agent', 'Test capabilities');
            const server = new Taupo({
                agents: { testAgent: agent },
            });

            const response = await server.fetch(
                new Request('http://localhost/agent/testAgent/metadata'),
            );
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.name).toBe('test-agent');
            expect(data.capabilities).toBe('Test capabilities');
            expect(data.type).toBe('agent');
            expect(data.tools).toEqual(['testTool']);
        });

        it('should return 404 for non-existent agent', async () => {
            const agent = createMockAgent('test-agent', 'Test capabilities');
            const server = new Taupo({
                agents: { testAgent: agent },
            });

            const response = await server.fetch(
                new Request('http://localhost/agent/non-existent/metadata'),
            );
            const data = (await response.json()) as ErrorResponse;

            expect(response.status).toBe(404);
            expect(data.error).toBe('Agent not found');
            expect(data.details).toContain('non-existent');
        });

        it('should return agent tree for router agent', async () => {
            const subAgent = createMockAgent('sub-agent', 'Sub agent');
            const router = createMockRouterAgent('router', [subAgent]);

            const server = new Taupo({
                agents: { myRouter: router },
            });

            const response = await server.fetch(
                new Request('http://localhost/agent/myRouter/metadata'),
            );
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.name).toBe('router');
            expect(data.type).toBe('router');
            expect(data.subAgents).toBeDefined();
            expect(data.subAgents).toHaveLength(1);
            expect(data.subAgents[0].name).toBe('sub-agent');
        });
    });

    describe('POST /agent/:name/generate', () => {
        it('should return 404 for non-existent agent', async () => {
            const agent = createMockAgent('test-agent', 'Test capabilities');
            const server = new Taupo({
                agents: { testAgent: agent },
            });

            const response = await server.fetch(
                new Request('http://localhost/agent/non-existent/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompt: 'test' }),
                }),
            );
            const data = (await response.json()) as ErrorResponse;

            expect(response.status).toBe(404);
            expect(data.error).toBe('Agent not found');
        });

        it('should return 400 for invalid request body', async () => {
            const agent = createMockAgent('test-agent', 'Test capabilities');
            const server = new Taupo({
                agents: { testAgent: agent },
            });

            const response = await server.fetch(
                new Request('http://localhost/agent/testAgent/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({}),
                }),
            );
            const data = (await response.json()) as ErrorResponse;

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid request body');
            expect(data.details).toContain('prompt');
        });

        it('should return 400 for invalid JSON', async () => {
            const agent = createMockAgent('test-agent', 'Test capabilities');
            const server = new Taupo({
                agents: { testAgent: agent },
            });

            const response = await server.fetch(
                new Request('http://localhost/agent/testAgent/generate', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: 'invalid json',
                }),
            );
            const data = (await response.json()) as ErrorResponse;

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid request body');
            expect(data.details).toContain('JSON');
        });
    });

    describe('POST /agent/:name/stream', () => {
        it('should return 404 for non-existent agent', async () => {
            const agent = createMockAgent('test-agent', 'Test capabilities');
            const server = new Taupo({
                agents: { testAgent: agent },
            });

            const response = await server.fetch(
                new Request('http://localhost/agent/non-existent/stream', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ prompt: 'test' }),
                }),
            );
            const data = (await response.json()) as ErrorResponse;

            expect(response.status).toBe(404);
            expect(data.error).toBe('Agent not found');
        });

        it('should return 400 for invalid request body', async () => {
            const agent = createMockAgent('test-agent', 'Test capabilities');
            const server = new Taupo({
                agents: { testAgent: agent },
            });

            const response = await server.fetch(
                new Request('http://localhost/agent/testAgent/stream', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({}),
                }),
            );
            const data = (await response.json()) as ErrorResponse;

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid request body');
            expect(data.details).toContain('prompt');
        });

        it('should return 400 for invalid JSON', async () => {
            const agent = createMockAgent('test-agent', 'Test capabilities');
            const server = new Taupo({
                agents: { testAgent: agent },
            });

            const response = await server.fetch(
                new Request('http://localhost/agent/testAgent/stream', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: 'invalid json',
                }),
            );
            const data = (await response.json()) as ErrorResponse;

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid request body');
            expect(data.details).toContain('JSON');
        });
    });

    describe('Middleware', () => {
        it('should apply middleware to all routes', async () => {
            const agent = createMockAgent('test-agent', 'Test capabilities');
            let middlewareCalled = false;

            const middleware = async (c: any, next: any) => {
                middlewareCalled = true;
                await next();
            };

            const server = new Taupo({
                agents: { testAgent: agent },
                middleware: [middleware],
            });

            await server.fetch(new Request('http://localhost/agents'));

            expect(middlewareCalled).toBe(true);
        });

        it('should apply multiple middleware in order', async () => {
            const agent = createMockAgent('test-agent', 'Test capabilities');
            const callOrder: number[] = [];

            const middleware1 = async (c: any, next: any) => {
                callOrder.push(1);
                await next();
                callOrder.push(4);
            };

            const middleware2 = async (c: any, next: any) => {
                callOrder.push(2);
                await next();
                callOrder.push(3);
            };

            const server = new Taupo({
                agents: { testAgent: agent },
                middleware: [middleware1, middleware2],
            });

            await server.fetch(new Request('http://localhost/agents'));

            expect(callOrder).toEqual([1, 2, 3, 4]);
        });
    });
});
