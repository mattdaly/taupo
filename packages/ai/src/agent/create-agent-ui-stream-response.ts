import {
    validateUIMessages,
    createUIMessageStream,
    createUIMessageStreamResponse,
    convertToModelMessages,
    Output,
    generateId,
    type InferUITools,
    type UIMessage,
    type UIMessageStreamOptions,
    type ToolSet,
    type UIDataTypes,
} from 'ai';
import { Agent } from './agent';
import { ToolCallContext } from '../tool/tool';

export type CreateAgentUIStreamResponseOptions<
    CALL_OPTIONS = never,
    TOOLS extends ToolSet = {},
    OUTPUT extends Output.Output = never,
    MESSAGE_METADATA = unknown,
> = {
    agent: Agent<CALL_OPTIONS, TOOLS, OUTPUT>;
    messages: UIMessage<MESSAGE_METADATA, UIDataTypes, InferUITools<TOOLS>>[];
    context?: ToolCallContext;
    maxMessagesInContext?: number;
} & ResponseInit & {
        consumeSseStream?: (options: {
            stream: ReadableStream<string>;
        }) => PromiseLike<void> | void;
    } & UIMessageStreamOptions<
        UIMessage<MESSAGE_METADATA, UIDataTypes, InferUITools<TOOLS>>
    >;

/**
 * Runs the agent and returns a response object with a UI message stream.
 * Replicates the native functionality of createAgentUIStreamResponse, but with the ability to pass the writer down to the agent for use in tools.
 *
 * @param agent - The agent to run.
 * @param messages - The input UI messages.
 *
 * @returns The response object.
 */

export async function createAgentUIStreamResponse<
    CALL_OPTIONS = never,
    TOOLS extends ToolSet = {},
    OUTPUT extends Output.Output = never,
    MESSAGE_METADATA = unknown,
>({
    headers,
    status,
    statusText,
    consumeSseStream,
    ...args
}: CreateAgentUIStreamResponseOptions<
    CALL_OPTIONS,
    TOOLS,
    OUTPUT,
    MESSAGE_METADATA
>): Promise<Response> {
    const { agent, messages, context, maxMessagesInContext, ...streamOptions } =
        args;

    const validatedMessages = await validateUIMessages({
        messages,
    });

    const modelMessages = convertToModelMessages(validatedMessages, {});

    // we need a messageId for status reconciliation, so generate one whichever way we can
    const messageId = streamOptions.generateMessageId?.() ?? generateId();

    const stream = createUIMessageStream<
        UIMessage<MESSAGE_METADATA, UIDataTypes, InferUITools<TOOLS>>
    >({
        execute: async ({ writer }) => {
            if (streamOptions.sendStart !== false) {
                writer.write({ type: 'start', messageId });
            }

            const stream = await agent.stream({
                messages: modelMessages,
                maxMessagesInContext,
                options: {
                    experimental_context: context,
                } as any,
                writer: {
                    write: writer.write,
                    status: (status: string) =>
                        writer.write({
                            type: 'data-status',
                            data: { text: status },
                        }),
                },
            });

            writer.merge(
                stream.toUIMessageStream({
                    ...streamOptions,
                    generateMessageId: () => messageId,
                    sendStart: false,
                    onError: error => {
                        console.error('[Agent Stream Error]:', error);
                        return (
                            streamOptions.onError?.(error) ??
                            'An error occurred'
                        );
                    },
                }),
            );
        },
        onError: streamOptions.onError,
    });

    return createUIMessageStreamResponse({
        headers,
        status,
        statusText,
        consumeSseStream,
        stream,
    });
}
