import type { Context } from 'hono';
import { streamSSE } from 'hono/streaming';
import type { StreamTextResult } from 'ai';

/**
 * Converts an AI SDK StreamTextResult into a Server-Sent Events response.
 * This handles streaming the agent's response chunks to the client.
 *
 * @param c - Hono context
 * @param streamResult - The streaming result from agent.stream()
 * @returns A streaming SSE response
 *
 * @example
 * ```typescript
 * const result = await agent.stream(options);
 * return handleStreamResponse(c, result);
 * ```
 */
export async function handleStreamResponse(
    c: Context,
    streamResult: StreamTextResult<any, any>,
) {
    return streamSSE(c, async stream => {
        try {
            // Stream all chunks from the AI SDK
            for await (const chunk of streamResult.fullStream) {
                // Send each chunk as an SSE event
                await stream.writeSSE({
                    data: JSON.stringify(chunk),
                    event: chunk.type,
                });
            }
        } catch (error) {
            // Send error event if streaming fails
            await stream.writeSSE({
                data: JSON.stringify({
                    type: 'error',
                    error:
                        error instanceof Error
                            ? error.message
                            : 'Unknown error',
                }),
                event: 'error',
            });
        }
    });
}
