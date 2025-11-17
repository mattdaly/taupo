import {
    tool,
    type GenerateTextResult,
    type StreamTextResult,
    type ToolSet,
    type Tool,
    type StaticToolResult,
} from 'ai';
import * as z from 'zod';
import {
    Agent,
    AgentInfo,
    type AgentCallParameters,
    type AgentSettings,
} from './agent';

/**
 * Agent tree node for visualization
 */
export interface AgentInfoNode extends AgentInfo {
    type: 'agent' | 'router';
    tools?: string[];
    subAgents?: AgentInfoNode[];
}

function createAgentInstructions<TOOLS extends ToolSet = {}>(
    instructions: string | undefined,
    agents: (Agent<TOOLS, any> | RouterAgent)[],
    confidenceThreshold: number = 0.7,
) {
    const agentDescriptions = agents.map(agent => {
        if (agent instanceof RouterAgent) {
            const nestedSubAgents = Array.from(agent.subAgents.values())
                .map(
                    subAgent =>
                        `  - "${subAgent.info.name}": ${subAgent.info.capabilities}`,
                )
                .join('\n');
            return `- "${agent.info.name}" - has the following sub-agents:\n${nestedSubAgents}`;
        }
        return `- "${agent.info.name}": ${agent.info.capabilities}`;
    });

    return `${instructions}

<routing>
You are a routing coordinator. Analyze the conversation and decide which agent to route to.

Available agents:
${agentDescriptions.join('\n')}

Routing decision:
- Pick a TOP-LEVEL agent by its name (in quotations), analyzing either:
  * Its direct description (for non-router agents), OR
  * Its sub-agents' names + descriptions (for router agents)
- If the request matches a sub-agent's capability, select the PARENT router agent (not the sub-agent directly)
- Calculate a confidence score as a DECIMAL number between 0.0 and 1.0 (NOT 0-10, NOT 0-100, NOT 1-5)
  Examples: 0.95 (very confident), 0.75 (fairly confident), 0.45 (not confident)
- If confidence >= ${confidenceThreshold}: call the selectAgent tool with a VALID agentId (exact match from the list above), reasoning, and confidence
- If confidence < ${confidenceThreshold} OR no agent can handle the request: DO NOT call selectAgent - instead respond directly with text
- NEVER provide agentId: "undefined", "null", or an invalid agent name

Routing rules:
- ALWAYS check the last 2-3 messages for topic context before deciding
- If the recent conversation was about a specific topic (cars, invoices, fruits, etc.), assume follow-up questions relate to that SAME topic
- HOWEVER, if a question is clearly about a completely different domain (e.g., "tell me about horses" after discussing invoices), ignore previous context
- Short questions like "how do I...?", "what about...?", "can I...?" almost always continue the current conversation topic
- Set confidence to 0.9+ when routing follow-up questions to the same topic area as previous messages
- Only ask for clarification if BOTH conditions are true: (1) question is ambiguous AND (2) no recent conversation provides context
- Use detailed agent descriptions to disambiguate when there's truly no context
- Be brief and natural in clarification messages
</routing>

<out_of_scope_handling>
When a request is clearly outside the scope of ALL available agents:
- DO NOT call the selectAgent tool
- Respond directly with a brief, natural message explaining you can only help with the topics covered by your available agents
- List the general capabilities (e.g., "I can help with Danish VAT, invoicing, customers, and accounting")
</error_handling>`;
}

type TOOLS = {
    selectAgent: Tool;
};

/**
 * Configuration settings for a RouterAgent.
 */
export type RouterAgentSettings<CALL_OPTIONS = never> = Omit<
    AgentSettings<CALL_OPTIONS, TOOLS>,
    | 'capabilities'
    | 'tools'
    | 'activeTools'
    | 'toolChoice'
    | 'stopWhen'
    | 'output'
    | 'experimental_repairToolCall'
> & {
    /**
     * The sub-agents to delegate to. Each must have a unique description.
     */
    subAgents: (Agent<any, any> | RouterAgent)[];
    /**
     * Confidence threshold for routing decisions (0-1).
     * If confidence is below this threshold, the router will ask for clarification.
     * @default 0.7
     */
    confidenceThreshold?: number;
};

/**
 * A routing agent that delegates requests to specialized sub-agents.
 *
 * Routes based on sub-agent descriptions using structured output. Supports nesting.
 */
export class RouterAgent<CALL_OPTIONS = never> extends Agent<
    CALL_OPTIONS,
    TOOLS
> {
    public readonly subAgents: Map<
        string,
        Agent<any, any, any> | RouterAgent<any>
    >;

    constructor(settings: RouterAgentSettings<CALL_OPTIONS>) {
        const subAgents = settings.subAgents.reduce(
            (map, agent) => map.set(agent.info.name, agent),
            new Map(),
        );
        const agentEnum = subAgents.keys().toArray() as [string, ...string[]];

        super({
            ...settings,
            capabilities: 'Routes requests to the appropriate sub-agent',
            instructions: createAgentInstructions<TOOLS>(
                settings.instructions,
                settings.subAgents,
                settings.confidenceThreshold,
            ),
            tools: {
                selectAgent: tool({
                    description:
                        'Select an agent to route to when you have a confident choice',
                    inputSchema: z.object({
                        agentId: z
                            .enum(agentEnum)
                            .describe(
                                'ID of agent to route to if confidence is above threshold',
                            ),
                    }),
                    outputSchema: z.object({
                        agentId: z
                            .enum(agentEnum)
                            .describe('ID of agent to route to'),
                    }),
                    execute: async ({ agentId }) => {
                        return {
                            agentId: agentId,
                        };
                    },
                }),
            },
        });
        this.subAgents = subAgents;
    }

    async generate(
        options: AgentCallParameters<CALL_OPTIONS>,
    ): Promise<GenerateTextResult<TOOLS, never>> {
        const routerResult = await super.generate(options);

        const agentId = (
            routerResult.steps
                .flatMap(step => step.content)
                .find(
                    content =>
                        content.type === 'tool-result' &&
                        content.toolName === 'selectAgent',
                ) as StaticToolResult<TOOLS>
        )?.output.agentId;

        let agent: Agent<any, any, any> | RouterAgent<any> | undefined;

        if (agentId) {
            agent = this.subAgents.get(agentId);

            if (!agent) {
                console.error(
                    `[RouterAgent] Suggested agent that doesn't exist. Failed to find agent for id: "${agentId}"`,
                );
            }
        }

        if (!agent) {
            return routerResult;
        }

        // TODO: the type of CALL_OPTIONS (and their callOptionSchema) is different to the routers, hence the error
        return agent.generate(options as any);
    }

    async stream(
        options: AgentCallParameters<CALL_OPTIONS>,
    ): Promise<StreamTextResult<TOOLS, never>> {
        const writer = options.writer;

        writer?.write({
            type: 'data-status',
            data: { text: 'Determining sub-agent to route to...' },
        });

        const routerStream = await super.stream(options);

        let agentId: string | undefined;

        for await (const chunk of routerStream.fullStream) {
            if (
                chunk.type === 'tool-result' &&
                chunk.toolName === 'selectAgent'
            ) {
                agentId = chunk.output.agentId;
            }
        }

        let agent: Agent<any, any, any> | RouterAgent<any> | undefined;

        if (agentId) {
            agent = this.subAgents.get(agentId);

            if (!agent) {
                console.error(
                    `[RouterAgent] Suggested agent that doesn't exist. Failed to find agent for id: "${agentId}"`,
                );
            }
        }

        if (!agent) {
            return routerStream;
        }

        writer?.write({
            type: 'data-handoff',
            data: { agent: agent.info.name },
        });
        writer?.write({
            type: 'data-status',
            data: { text: 'Executing sub-agent...' },
        });

        // TODO: the type of CALL_OPTIONS (and their callOptionSchema) is different to the routers, hence the error
        return agent.stream(options as any);
    }

    public getAgentTree(): AgentInfoNode {
        return {
            type: 'router',
            ...this.info,
            subAgents: Array.from(this.subAgents.values()).map(agent => {
                if (agent instanceof RouterAgent) {
                    return agent.getAgentTree();
                }

                const tools = agent.tools ? Object.keys(agent.tools) : [];

                return {
                    ...agent.info,
                    type: 'agent',
                    tools,
                };
            }),
        };
    }
}
