# @taupo/ai

Core AI agent framework extending the [Vercel AI SDK](https://sdk.vercel.ai/) with specialized agents, routing, tools, and artifacts.

`@taupo/ai` provides building blocks for creating AI agents with advanced capabilities like automatic routing, context management, and type-safe tool execution. It wraps the AI SDK's `ToolLoopAgent` with enhanced features for production applications.

## Features

- 🤖 **Agent System** - Create specialized agents with tools, context, and structured capabilities
- 🔀 **Smart Routing** - RouterAgent automatically delegates to the right sub-agent based on request context
- 🛠️ **Type-Safe Tools** - Build tools with full TypeScript support and runtime context
- 🎨 **Artifacts** - Create and update structured outputs that stream to the UI
- 📝 **Context Management** - Automatic message history management with configurable limits
- 🌊 **Streaming Support** - Full support for streaming responses with incremental updates
- 🧩 **Composable** - Nest agents and routers to build complex multi-agent systems

## Installation

```bash
npm install @taupo/ai ai@beta zod
```

## Quick Start

### Basic Agent

```typescript
import { Agent, tool } from '@taupo/ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const weatherAgent = new Agent({
    name: 'Weather Agent',
    capabilities: 'Provides weather information for any location',
    model: google('gemini-2.5-pro'),
    instructions:
        'You are a helpful weather assistant. Use the getWeather tool to fetch current conditions.',
    tools: {
        getWeather: tool({
            description: 'Get current weather for a location',
            inputSchema: z.object({
                location: z.string().describe('City name or location'),
            }),
            outputSchema: z.object({
                temperature: z.number(),
                condition: z.string(),
            }),
            execute: async ({ location }) => {
                // Your weather API call here
                return { temperature: 72, condition: 'Sunny' };
            },
        }),
    },
});

// Use the agent
const result = await weatherAgent.generate({
    prompt: "What's the weather in San Francisco?",
});

console.log(result.text);
```

### RouterAgent

Route requests to specialized sub-agents automatically:

```typescript
import { RouterAgent } from '@taupo/ai';

const invoiceAgent = new Agent({
    name: 'Invoice Agent',
    capabilities: 'Handles invoice creation, booking, and sending',
    model: google('gemini-2.5-pro'),
    instructions: 'You are an invoice management expert...',
    tools: {
        // Invoice tools
    },
});

const customerAgent = new Agent({
    name: 'Customer Agent',
    capabilities: 'Manages customer information and queries',
    model: google('gemini-2.5-pro'),
    instructions: 'You are a customer service expert...',
    tools: {
        // Customer tools
    },
});

// Create a router that automatically delegates
const mainRouter = new RouterAgent({
    name: 'Business Assistant',
    model: google('gemini-2.5-pro'),
    instructions: 'You are a helpful business assistant.',
    subAgents: [invoiceAgent, customerAgent],
    confidenceThreshold: 0.7, // Optional, default is 0.7
});

// The router automatically picks the right agent
const result = await mainRouter.generate({
    prompt: 'Create an invoice for Acme Corp',
});
// Routes to invoiceAgent automatically
```

## API Reference

### Agent

The `Agent` class extends the AI SDK's `ToolLoopAgent` with additional features.

#### Constructor

```typescript
new Agent<CALL_OPTIONS, TOOLS, OUTPUT>(settings: AgentSettings)
```

#### AgentSettings

```typescript
interface AgentSettings extends ToolLoopAgentSettings {
    // Required fields
    name: string;
    capabilities: string;

    // Inherited from ToolLoopAgentSettings
    model: LanguageModelV1;
    instructions: string;
    tools?: ToolSet;

    // Optional fields
    maxMessagesInContext?: number;
    // ... other ToolLoopAgentSettings
}
```

**Key Properties:**

- **name** - Short display name for the agent (e.g., "Weather Agent", "Invoice Assistant")
- **capabilities** - Description of what the agent can do. Used by RouterAgent for routing decisions
- **model** - AI model to use (from any AI SDK provider)
- **instructions** - System prompt for the agent
- **tools** - Object mapping tool names to tool definitions
- **maxMessagesInContext** - Maximum number of messages to keep in context (default: unlimited)

#### Methods

**`generate(options: AgentCallParameters): Promise<GenerateTextResult>`**

Execute the agent without streaming.

```typescript
const result = await agent.generate({
    prompt: 'Hello!',
    // or
    messages: [{ role: 'user', content: 'Hello!' }],

    // Optional
    options: callOptions,
    maxMessagesInContext: 10,
    abortSignal: controller.signal,
});

console.log(result.text);
console.log(result.steps); // Tool calls and results
```

**`stream(options: AgentCallParameters): Promise<StreamTextResult>`**

Execute the agent with streaming.

```typescript
const stream = await agent.stream({
    prompt: 'Tell me a story',
    writer: uiMessageStreamWriter, // Optional, for artifacts
});

for await (const chunk of stream.textStream) {
    process.stdout.write(chunk);
}
```

**`getAgentTree(): AgentInfoNode`**

Get metadata about the agent and its tools.

```typescript
const tree = agent.getAgentTree();
console.log(tree.name, tree.type, tree.tools);
```

### RouterAgent

Automatically routes requests to specialized sub-agents based on capabilities.

#### Constructor

```typescript
new RouterAgent<CALL_OPTIONS>(settings: RouterAgentSettings)
```

#### RouterAgentSettings

```typescript
interface RouterAgentSettings {
    // Required fields
    name: string;
    model: LanguageModelV1;
    instructions: string;
    subAgents: (Agent | RouterAgent)[];

    // Optional
    confidenceThreshold?: number; // Default: 0.7
    maxMessagesInContext?: number;
    // ... other agent settings
}
```

**Key Properties:**

- **subAgents** - Array of agents to route between. Each must have a unique name
- **confidenceThreshold** - Confidence threshold (0-1) for routing decisions. If confidence is below threshold, the router responds directly instead of delegating

#### How Routing Works

The RouterAgent:

1. Analyzes the request and conversation context
2. Compares against sub-agent capabilities
3. Calculates a confidence score (0-1)
4. If confidence ≥ threshold: routes to the best sub-agent
5. If confidence < threshold: responds directly or asks for clarification

**Context-Aware Routing:**

- Remembers recent conversation topics
- Follow-up questions automatically route to the same agent
- "How do I...?" after discussing invoices → routes to invoice agent
- Clearly different topics override previous context

#### Nested Routers

RouterAgents can contain other RouterAgents for hierarchical delegation:

```typescript
const accountingRouter = new RouterAgent({
    name: 'Accounting',
    model: google('gemini-2.5-pro'),
    instructions: 'Handle accounting tasks',
    subAgents: [journalAgent, ledgerAgent, reportAgent],
});

const businessRouter = new RouterAgent({
    name: 'Business Suite',
    model: google('gemini-2.5-pro'),
    instructions: 'Handle all business operations',
    subAgents: [invoiceAgent, customerAgent, accountingRouter],
});

// "Generate a balance sheet" → business → accounting → report
```

### Tool

Type-safe tool definition with runtime context.

```typescript
import { tool } from '@taupo/ai';
import { z } from 'zod';

const myTool = tool({
    description: 'What this tool does',
    inputSchema: z.object({
        param: z.string().describe('Parameter description'),
    }),
    outputSchema: z.object({
        result: z.string(),
    }),
    execute: async (input, options) => {
        // options.experimental_context - Custom context
        // options.writer - UI stream writer (if available)

        return { result: 'success' };
    },
});
```

**Tool Schema:**

```typescript
interface Tool<INPUT, OUTPUT> {
    description: string;
    inputSchema: ZodSchema<INPUT>;
    outputSchema: ZodSchema<OUTPUT>;
    execute: (
        input: INPUT,
        options: ToolCallOptions,
    ) => OUTPUT | Promise<OUTPUT> | AsyncIterable<OUTPUT>;
}
```

**ToolCallOptions:**

```typescript
interface ToolCallOptions {
    experimental_context: ToolCallContext;
    writer?: UIMessageStreamWriter;
}
```

### Artifact

Create structured outputs that stream to the UI with incremental updates.

```typescript
import { artifact } from '@taupo/ai';
import { z } from 'zod';

const chartArtifact = artifact({
    id: 'sales-chart',
    outputSchema: z.object({
        title: z.string(),
        data: z.array(
            z.object({
                month: z.string(),
                sales: z.number(),
            }),
        ),
    }),
});

// In a tool
const myTool = tool({
    description: 'Generate a sales chart',
    // ...
    execute: async (input, options) => {
        const chart = await chartArtifact.create(
            {
                title: 'Q1 Sales',
                data: [],
            },
            options.experimental_context,
        );

        // Stream updates
        await chart.update({
            data: [{ month: 'Jan', sales: 1000 }],
        });

        await chart.update({
            data: [
                { month: 'Jan', sales: 1000 },
                { month: 'Feb', sales: 1200 },
            ],
        });

        return { success: true };
    },
});
```

**How Artifacts Work:**

1. Define schema with `artifact()`
2. Create artifact in tool with initial data
3. Stream updates with `update()` - partial updates are merged
4. Frontend receives `data-artifact` stream events
5. UI updates in real-time as data changes

**Important:** Artifacts require a `writer` in the agent call:

```typescript
import { createAgentUIStreamResponse } from '@taupo/ai';

// In your API route
const stream = await agent.stream({
    prompt: 'Generate chart',
    writer: createAgentUIStreamResponse(), // Required for artifacts
});
```

## Usage Examples

### Agent with Context Management

```typescript
const agent = new Agent({
    name: 'Support Agent',
    capabilities: 'Customer support',
    model: google('gemini-2.5-pro'),
    instructions: 'You are a support agent',
    maxMessagesInContext: 20, // Keep last 20 messages
});

// Or override per call
const result = await agent.generate({
    messages: conversationHistory,
    maxMessagesInContext: 10, // Override to 10 for this call
});
```

### Tool with Context

```typescript
const searchTool = tool({
    description: 'Search the knowledge base',
    inputSchema: z.object({
        query: z.string(),
    }),
    outputSchema: z.object({
        results: z.array(z.string()),
    }),
    execute: async (input, options) => {
        // Access custom context
        const userId = options.experimental_context.userId;

        // Your search logic
        return { results: ['Result 1', 'Result 2'] };
    },
});

const agent = new Agent({
    name: 'Search Agent',
    capabilities: 'Searches knowledge base',
    model: google('gemini-2.5-pro'),
    instructions: 'Use search tool to answer questions',
    tools: { search: searchTool },
});

// Pass context
await agent.generate({
    prompt: 'Find documentation about routing',
    options: {
        experimental_context: {
            userId: 'user-123',
        },
    },
});
```

### Streaming with Artifacts

```typescript
const analysisArtifact = artifact({
    id: 'data-analysis',
    outputSchema: z.object({
        status: z.string(),
        insights: z.array(z.string()),
        confidence: z.number(),
    }),
});

const analyzeTool = tool({
    description: 'Analyze data and show progressive results',
    inputSchema: z.object({
        dataUrl: z.string(),
    }),
    outputSchema: z.object({
        completed: z.boolean(),
    }),
    execute: async (input, options) => {
        const analysis = await analysisArtifact.create(
            {
                status: 'Starting analysis...',
                insights: [],
                confidence: 0,
            },
            options.experimental_context,
        );

        // Progressive updates
        await analysis.update({
            status: 'Processing...',
            insights: ['Found pattern A'],
            confidence: 0.3,
        });

        await analysis.update({
            status: 'Complete',
            insights: ['Found pattern A', 'Detected trend B'],
            confidence: 0.9,
        });

        return { completed: true };
    },
});
```

### Multi-Agent System

```typescript
// Specialized agents
const researchAgent = new Agent({
    name: 'Research Agent',
    capabilities: 'Conducts research and fact-checking',
    model: google('gemini-2.5-pro'),
    instructions: 'You research topics thoroughly',
    tools: {
        /* research tools */
    },
});

const writingAgent = new Agent({
    name: 'Writing Agent',
    capabilities: 'Writes articles and content',
    model: google('gemini-2.5-pro'),
    instructions: 'You write engaging content',
    tools: {
        /* writing tools */
    },
});

const editingAgent = new Agent({
    name: 'Editing Agent',
    capabilities: 'Edits and proofreads content',
    model: google('gemini-2.5-pro'),
    instructions: 'You polish and improve text',
    tools: {
        /* editing tools */
    },
});

// Content router
const contentRouter = new RouterAgent({
    name: 'Content Team',
    model: google('gemini-2.5-pro'),
    instructions: 'You coordinate content creation',
    subAgents: [researchAgent, writingAgent, editingAgent],
});

// General business router
const mainRouter = new RouterAgent({
    name: 'Business Assistant',
    model: google('gemini-2.5-pro'),
    instructions: 'You help with all business needs',
    subAgents: [invoiceAgent, customerAgent, contentRouter],
});

// "Write an article about AI" → main → content → writing
// "Check my latest draft" → main → content → editing
```

### Error Handling

```typescript
try {
    const result = await agent.generate({
        prompt: 'Process this request',
    });

    if (result.error) {
        console.error('Agent error:', result.error);
    }
} catch (error) {
    console.error('Execution error:', error);
}

// With abort signal
const controller = new AbortController();

setTimeout(() => controller.abort(), 5000);

try {
    const result = await agent.generate({
        prompt: 'Long running task',
        abortSignal: controller.signal,
    });
} catch (error) {
    if (error.name === 'AbortError') {
        console.log('Request timed out');
    }
}
```

## Advanced Usage

### Custom Agent Preparation

```typescript
const agent = new Agent({
    name: 'Custom Agent',
    capabilities: 'Does custom things',
    model: google('gemini-2.5-pro'),
    instructions: 'Base instructions',
    tools: {
        /* tools */
    },
    prepareCall: async callOptions => {
        // Customize per call
        return {
            ...callOptions,
            instructions: `${callOptions.instructions}\n\nAdditional context: ${Date.now()}`,
            experimental_context: {
                ...callOptions.experimental_context,
                timestamp: Date.now(),
            },
        };
    },
});
```

### UI Integration with createAgentUIStreamResponse

```typescript
import { createAgentUIStreamResponse } from '@taupo/ai';

// In your API route handler
export async function POST(req: Request) {
    const { messages } = await req.json();

    const stream = await agent.stream({
        messages,
        writer: createAgentUIStreamResponse(),
    });

    return new Response(stream.toDataStreamResponse(), {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
        },
    });
}

// Frontend with Vercel AI SDK
import { useChat } from 'ai/react';

const { messages, input, handleSubmit } = useChat({
    api: '/api/chat',
});
```

## Type Safety

All exports are fully typed:

```typescript
import type {
    Agent,
    AgentSettings,
    AgentCallParameters,
    AgentInfo,
    RouterAgent,
    RouterAgentSettings,
    AgentInfoNode,
    Tool,
    ToolCallOptions,
    ToolCallContext,
    Artifact,
    ArtifactOptions,
} from '@taupo/ai';
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { Agent, tool } from '@taupo/ai';
import { mockLanguageModel } from 'ai/test';

describe('My Agent', () => {
    it('should use tools correctly', async () => {
        const agent = new Agent({
            name: 'Test Agent',
            capabilities: 'Testing',
            model: mockLanguageModel({
                doGenerate: async () => ({
                    // Mock response
                }),
            }),
            instructions: 'You are a test agent',
            tools: {
                /* tools */
            },
        });

        const result = await agent.generate({
            prompt: 'Test prompt',
        });

        expect(result.text).toBeTruthy();
    });
});
```

## Best Practices

1. **Agent Capabilities** - Write clear, specific capability descriptions for better routing
2. **Context Limits** - Set `maxMessagesInContext` to prevent token overflow
3. **Tool Naming** - Use descriptive tool names and detailed descriptions
4. **Error Recovery** - Implement proper error handling in tool execution
5. **Streaming** - Use streaming for long-running operations with artifacts
6. **Router Hierarchy** - Organize agents by domain (invoicing, customers, accounting)
7. **Testing** - Mock models and test agent logic independently

## Contributing

Contributions are welcome! Please see the main repository for contribution guidelines.

## License

MIT

## Related Projects

- [@taupo/server](../server) - HTTP server framework for Taupo agents
- [@taupo/cli](../cli) - Development tools and UI
- [AI SDK](https://sdk.vercel.ai/) - Underlying AI model framework
- [Vercel AI SDK UI](https://sdk.vercel.ai/docs/ai-sdk-ui/overview) - React hooks for AI chat
