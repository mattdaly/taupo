import {
    Output,
    ToolLoopAgent,
    type GenerateTextResult,
    type ModelMessage,
    type StreamTextResult,
    type ToolLoopAgentSettings,
    type ToolSet,
} from 'ai';
import { type Writer } from './types';
import { type ToolCallContextWithWriter } from '../tool/tool';
import { AgentInfoNode } from './agent-router';

export type AgentInfo = {
    name: string;
    capabilities: string;
    model: string | undefined;
};

export type AgentSettings<
    CALL_OPTIONS = never,
    TOOLS extends ToolSet = {},
    OUTPUT extends Output.Output = never,
> = ToolLoopAgentSettings<CALL_OPTIONS, TOOLS, OUTPUT> & {
    /**
     * Short display name for the agent.
     *
     * @example
     * ```typescript
     * name: "Eva"
     * name: "Invoicing Agent"
     * name: "SKAT Agent"
     * ```
     */
    name: string;
    /**
     * Capabilities of the agent.
     *
     * Provides hints to the RouterAgent for routing decisions.
     *
     * @example
     * ```typescript
     * capabilities: "handles invoice creation, booking, and sending"
     * capabilities: "handles Danish VAT deadlines and requirements"
     * capabilities: "handles accounting - journals, entries, and accounts"  // For RouterAgents
     * ```
     */
    capabilities: string;
    /**
     * The maximum number of messages to keep in the context.
     */
    maxMessagesInContext?: number;
};

export type AgentCallParameters<CALL_OPTIONS> = ([CALL_OPTIONS] extends [never]
    ? {
          options?: never;
      }
    : {
          options: CALL_OPTIONS;
      }) &
    ((
        | {
              prompt: string | Array<ModelMessage>;
              messages?: never;
          }
        | {
              messages: Array<ModelMessage>;
              prompt?: never;
          }
    ) & {
        abortSignal?: AbortSignal;
        maxMessagesInContext?: number;
        writer?: Writer;
    });

/**
 * Agent that wraps AI SDK's ToolLoopAgent with some required fields.
 */
export class Agent<
    CALL_OPTIONS = never,
    TOOLS extends ToolSet = {},
    OUTPUT extends Output.Output = never,
> extends ToolLoopAgent<CALL_OPTIONS, TOOLS, OUTPUT> {
    /**
     * The maximum number of messages to keep in the context.
     */
    private readonly maxMessagesInContext: number | undefined;
    /**
     * Information about the agent.
     */
    readonly info: AgentInfo;

    constructor(settings: AgentSettings<CALL_OPTIONS, TOOLS, OUTPUT>) {
        super({
            ...settings,
            prepareCall: async callOptions => {
                let preparedSettings: ToolLoopAgentSettings<
                    CALL_OPTIONS,
                    TOOLS,
                    OUTPUT
                >;

                if (settings.prepareCall) {
                    preparedSettings = await settings.prepareCall(callOptions);
                } else {
                    const { options, ...callSettings } = callOptions;
                    preparedSettings = {
                        ...callSettings,
                        experimental_context: {
                            ...callSettings.experimental_context,
                            ...(options as any)?.experimental_context,
                        },
                    };
                }

                return {
                    ...preparedSettings,
                    experimental_context: {
                        ...(preparedSettings?.experimental_context as
                            | object
                            | undefined),
                        _writer: (
                            callOptions as AgentCallParameters<CALL_OPTIONS>
                        ).writer,
                    } as ToolCallContextWithWriter,
                };
            },
        });

        this.maxMessagesInContext = settings.maxMessagesInContext;
        this.info = {
            name: settings.name,
            capabilities: settings.capabilities,
            model:
                typeof settings.model === 'object' &&
                'modelId' in settings.model
                    ? settings.model.modelId
                    : undefined,
        };
    }

    private limitMessageContextLength(
        options: AgentCallParameters<CALL_OPTIONS>,
    ) {
        const maxMessagesInContext =
            options.maxMessagesInContext ?? this.maxMessagesInContext;
        const callOptions = { ...options };

        if (options.messages?.length && maxMessagesInContext !== undefined) {
            callOptions.messages =
                options.messages.slice(-maxMessagesInContext);
        }

        return callOptions;
    }

    async generate(
        options: AgentCallParameters<CALL_OPTIONS>,
    ): Promise<GenerateTextResult<TOOLS, OUTPUT>> {
        return super.generate(this.limitMessageContextLength(options));
    }

    async stream(
        options: AgentCallParameters<CALL_OPTIONS>,
    ): Promise<StreamTextResult<TOOLS, OUTPUT>> {
        return super.stream(this.limitMessageContextLength(options));
    }

    public getAgentTree(): AgentInfoNode {
        return {
            type: 'agent',
            ...this.info,
        };
    }
}
