import type { Context } from 'hono';
import type { ErrorResponse } from '../types';

/**
 * Creates a standardized error response.
 *
 * @param status - HTTP status code
 * @param error - Error message
 * @param details - Optional additional error details
 * @returns ErrorResponse object
 */
export function createErrorResponse(
    status: number,
    error: string,
    details?: string,
): ErrorResponse {
    return {
        status,
        error,
        ...(details && { details }),
    };
}

/**
 * Sends a JSON error response with the appropriate status code.
 *
 * @param c - Hono context
 * @param status - HTTP status code
 * @param error - Error message
 * @param details - Optional additional error details
 * @returns JSON response
 */
export function errorResponse(
    c: Context,
    status: number,
    error: string,
    details?: string,
) {
    return c.json(createErrorResponse(status, error, details), status);
}

/**
 * Handles agent not found errors.
 *
 * @param c - Hono context
 * @param agentName - Name of the agent that was not found
 * @returns 404 JSON response
 */
export function agentNotFound(c: Context, agentName: string) {
    return errorResponse(
        c,
        404,
        'Agent not found',
        `No agent registered with name: ${agentName}`,
    );
}

/**
 * Handles invalid request body errors.
 *
 * @param c - Hono context
 * @param details - Optional details about what was invalid
 * @returns 400 JSON response
 */
export function invalidRequestBody(c: Context, details?: string) {
    return errorResponse(c, 400, 'Invalid request body', details);
}

/**
 * Handles agent execution errors.
 *
 * @param c - Hono context
 * @param error - The error that occurred
 * @returns 500 JSON response
 */
export function agentExecutionError(c: Context, error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(c, 500, 'Agent execution failed', message);
}
