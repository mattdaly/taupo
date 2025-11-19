# Taupo

A framework for building AI agents in TypeScript with automatic HTTP API generation.

Taupo wraps [Hono](https://hono.dev/) to provide a clean, type-safe way to expose AI agents as HTTP endpoints. Simply register your agents, and Taupo automatically generates REST APIs for agent execution, metadata, and discovery.

## Features

- 🚀 **Zero Configuration** - Register agents and get a production-ready HTTP server
- 🔄 **Auto-Generated APIs** - REST endpoints created automatically for each agent
- 🌊 **Streaming Support** - Built-in Server-Sent Events (SSE) for streaming responses
- 🔌 **Runtime Agnostic** - Works on Cloudflare Workers, Node.js, Deno, Bun, and more
- 🛠️ **Flexible Middleware** - Use standard Hono middleware for auth, logging, etc.
- 📊 **Agent Discovery** - Built-in endpoints for listing and inspecting agents
- 🎯 **Type Safe** - Full TypeScript support with comprehensive types

## Installation

```bash
npm install @taupo/server ai@beta zod
```

## Quick Start

```typescript
import { Taupo, Agent } from '@taupo/server';
import { google } from '@ai-sdk/google';

// Create your agents
const invoiceAgent = new Agent({
    name: 'Invoice Agent',
    capabilities: 'Handles invoice creation, booking, and sending',
    model: google('gemini-2.5-pro'),
    instructions: 'You are an invoice management expert...',
    tools: {
        // Your agent tools
    },
});

const customerAgent = new Agent({
    name: 'Customer Agent',
    capabilities: 'Manages customer information and queries',
    model: google('gemini-2.5-pro'),
    instructions: 'You are a customer service expert...',
    tools: {
        // Your agent tools
    },
});

// Create the server
const server = new Taupo({
    agents: {
        invoice: invoiceAgent,
        customer: customerAgent,
    },
});

// Export for Cloudflare Workers, Deno Deploy, etc.
export default server;
```

## API Reference

### Taupo Constructor

```typescript
new Taupo(config: TaupoConfig)
```

#### TaupoConfig

```typescript
interface TaupoConfig {
    agents: Record<string, Agent | RouterAgent | TaupoAgentConfiguration>;
    middleware?: Array<MiddlewareHandler>;
}

interface TaupoAgentConfiguration {
    agent: Agent | RouterAgent;
    uiStreamOptions: {
        context?: ToolCallContext | ((ctx: Context) => ToolCallContext);
        // ... other CreateAgentUIStreamResponseOptions
    };
}
```

- **agents** - Record of agents to register. Can be a direct agent instance or a configuration object.
- **middleware** - Optional array of Hono middleware functions applied to all routes.

### Agent Configuration

You can provide additional configuration for agents, specifically for the UI streaming endpoint (`/chat`), by using the `TaupoAgentConfiguration` object. This allows you to pass custom options and dynamic context to your tools.

```typescript
const server = new Taupo({
    agents: {
        // Simple registration
        simple: simpleAgent,

        // Advanced configuration with UI stream options
        advanced: {
            agent: advancedAgent,
            uiStreamOptions: {
                // Pass dynamic context to tools based on the request
                context: (c) => ({
                    userId: c.get('jwtPayload')?.sub,
                    headers: c.req.header(),
                }),
                // Handle stream completion
                onFinish: async (message) => {
                    await saveToDatabase(message);
                },
            },
        },
    },
});
```

### HTTP Endpoints

Taupo automatically generates the following REST endpoints:

**For Agent Discovery:**

- `GET /agents` - List all registered agents
- `GET /agent/:name/metadata` - Get detailed agent metadata

**For Agent Execution:**

- `POST /agent/:name/generate` - Non-streaming execution
- `POST /agent/:name/stream` - Direct streaming (raw AI SDK chunks)
- `POST /agent/:name/chat` - UI streaming (Vercel AI SDK UI compatible)

---

#### GET /agents

Lists all registered agents with basic information.

**Response:**

```typescript
{
  agents: [
    {
      name: string;
      capabilities: string;
      type: 'agent' | 'router';
      model?: string;
    }
  ]
}
```

**Example:**

```bash
curl http://localhost:3000/agents
```

#### GET /agent/:name/metadata

Returns detailed metadata for a specific agent.

For regular agents, includes:

- Agent info (name, capabilities, model)
- Available tools

For router agents, includes:

- Full agent tree with sub-agents
- Nested tool information

**Response:**

```typescript
{
  name: string;
  capabilities: string;
  type: 'agent' | 'router';
  model?: string;
  tools?: string[];
  subAgents?: AgentInfoNode[];
}
```

**Example:**

```bash
curl http://localhost:3000/agent/invoice/metadata
```

#### POST /agent/:name/generate

Executes an agent in non-streaming mode.

**Request Body:**

```typescript
{
  prompt?: string;
  messages?: ModelMessage[];
  options?: any;
}
```

You must provide either `prompt` or `messages`, but not both.

**Response:**
Returns the full AI SDK `GenerateTextResult` object.

**Example:**

```bash
curl -X POST http://localhost:3000/agent/invoice/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create an invoice for customer ABC"}'
```

#### POST /agent/:name/stream

Executes an agent in streaming mode.

**Request Body:**
Same as `/generate` endpoint.

**Response:**
Server-Sent Events (SSE) stream with the following event types:

- `text-delta` - Streaming text chunks
- `tool-call` - Tool execution started
- `tool-result` - Tool execution completed
- `error` - Error occurred during execution

**Example:**

```bash
curl -X POST http://localhost:3000/agent/invoice/stream \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Create an invoice for customer ABC"}'
```

#### POST /agent/:name/chat

Executes an agent in UI streaming mode, compatible with Vercel AI SDK UI.

**Request Body:**

```typescript
{
  messages: UIMessage[];
  maxMessagesInContext?: number;
}
```

UIMessages include the `parts` array format used by `useChat()` and other Vercel AI SDK UI hooks.

**Response:**
Vercel AI SDK UI-compatible stream with proper message validation and transformation.

**Use Case:**
This endpoint is specifically designed for frontends using Vercel AI SDK UI hooks like `useChat()`, `useAssistant()`, etc.

**Example with useChat():**

```typescript
const { messages, input, handleSubmit } = useChat({
    api: 'http://localhost:3000/agent/invoice/chat',
});
```

### Error Responses

All errors follow a consistent format:

```typescript
{
  status: number;
  error: string;
  details?: string;
}
```

**Common Status Codes:**

- `400` - Invalid request body
- `404` - Agent not found
- `500` - Agent execution error

## Usage Examples

### With Middleware

```typescript
import { Taupo } from '@taupo/server';
import { bearerAuth } from 'hono/bearer-auth';
import { logger } from 'hono/logger';

const server = new Taupo({
    agents: {
        invoice: invoiceAgent,
        customer: customerAgent,
    },
    middleware: [logger(), bearerAuth({ token: process.env.API_TOKEN })],
});

export default server;
```

### With RouterAgent

```typescript
import { RouterAgent } from '@taupo/server';

// Create a router that delegates to specialized agents
const mainRouter = new RouterAgent({
    name: 'Main Router',
    model: google('gemini-2.5-pro'),
    instructions: 'Route requests to the appropriate specialized agent',
    subAgents: [invoiceAgent, customerAgent, accountingAgent],
});

const server = new Taupo({
    agents: {
        main: mainRouter,
    },
});

export default server;
```

### Running Locally with Node.js

```typescript
import { Taupo } from '@taupo/server';
import { serve } from '@hono/node-server';

const server = new Taupo({
    agents: {
        invoice: invoiceAgent,
        customer: customerAgent,
    },
});

serve({
    fetch: server.fetch,
    port: 3000,
});

console.log('Server running at http://localhost:3000');
```

### Cloudflare Workers

```typescript
// src/index.ts
import { Taupo } from '@taupo/server';

const server = new Taupo({
    agents: {
        invoice: invoiceAgent,
        customer: customerAgent,
    },
});

export default server;
```

### Deno Deploy

```typescript
import { Taupo } from '@taupo/server';

const server = new Taupo({
    agents: {
        invoice: invoiceAgent,
        customer: customerAgent,
    },
});

Deno.serve(server.fetch);
```

## Advanced Usage

### Custom Error Handling

```typescript
import { Taupo } from '@taupo/server';

const server = new Taupo({
    agents: {
        invoice: invoiceAgent,
    },
    middleware: [
        async (c, next) => {
            try {
                await next();
            } catch (error) {
                console.error('Request failed:', error);
                return c.json(
                    {
                        status: 500,
                        error: 'Internal server error',
                    },
                    500,
                );
            }
        },
    ],
});
```

### CORS Configuration

```typescript
import { cors } from 'hono/cors';

const server = new Taupo({
    agents: {
        invoice: invoiceAgent,
    },
    middleware: [
        cors({
            origin: ['https://example.com'],
            allowMethods: ['GET', 'POST'],
        }),
    ],
});
```

### Request Validation

```typescript
const server = new Taupo({
    agents: {
        invoice: invoiceAgent,
    },
    middleware: [
        async (c, next) => {
            // Validate request headers, authentication, etc.
            const apiKey = c.req.header('X-API-Key');
            if (!apiKey || !isValidApiKey(apiKey)) {
                return c.json({ error: 'Unauthorized' }, 401);
            }
            await next();
        },
    ],
});
```

## Testing

Taupo servers can be easily tested using standard HTTP testing tools:

```typescript
import { describe, it, expect } from 'vitest';
import { Taupo } from '@taupo/server';

describe('My Server', () => {
    it('should list agents', async () => {
        const server = new Taupo({
            agents: { myAgent },
        });

        const response = await server.fetch(
            new Request('http://localhost/agents'),
        );

        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.agents).toHaveLength(1);
    });
});
```

## Contributing

Contributions are welcome! Please see the main repository for contribution guidelines.

## License

MIT

## Related Projects

- [@taupo/ai](../ai) - Core AI agent framework
- [Hono](https://hono.dev/) - Underlying web framework
- [AI SDK](https://sdk.vercel.ai/) - AI model integrations
