import {
    type UIMessageStreamWriter,
    type ToolCallOptions,
    type JSONValue,
    type FlexibleSchema,
} from 'ai';
import { validateTypes } from '@ai-sdk/provider-utils';

function mergeWithPartialDefaults<OUTPUT>(
    schema: FlexibleSchema<OUTPUT>,
    current: OUTPUT,
    updates: Partial<OUTPUT>,
): OUTPUT {
    const canSpread =
        current !== null &&
        typeof current === 'object' &&
        !Array.isArray(current) &&
        updates !== null &&
        typeof updates === 'object' &&
        !Array.isArray(updates);

    if (!canSpread) {
        return updates as OUTPUT;
    }

    if (
        typeof schema === 'object' &&
        'partial' in schema &&
        typeof schema.partial === 'function'
    ) {
        const defaults = schema.partial().parse({});
        return { ...defaults, ...current, ...updates } as OUTPUT;
    }

    return { ...current, ...updates } as OUTPUT;
}

export type Artifact<OUTPUT extends JSONValue | unknown | never = any> = {
    create: (
        data: OUTPUT,
        context: ToolCallOptions['experimental_context'],
    ) => Promise<{
        update: (data: Partial<OUTPUT>) => Promise<void>;
    }>;
};

export type ArtifactOptions<OUTPUT extends JSONValue | unknown | never = any> =
    {
        id: string;
        outputSchema: FlexibleSchema<OUTPUT>;
    };

/**
 * Helper to create artifacts using the stream writer in tools.
 */
export function artifact<OUTPUT extends JSONValue | unknown | never = any>({
    id,
    outputSchema,
}: ArtifactOptions<OUTPUT>): Artifact<OUTPUT> {
    return {
        create: async (
            data: OUTPUT,
            context: ToolCallOptions['experimental_context'],
        ) => {
            const writer = (context as { writer?: UIMessageStreamWriter })
                ?.writer;

            if (!writer) {
                throw new Error(
                    'No writer found in execution options. Are you creating the stream using createAgentUIStreamResponseWithArtifacts?',
                );
            }

            let currentData = mergeWithPartialDefaults(
                outputSchema,
                {} as OUTPUT,
                data,
            );

            await validateTypes({
                value: currentData,
                schema: outputSchema,
            });

            writer.write({ type: 'data-artifact', id, data });

            return {
                update: async (partialData: Partial<OUTPUT>) => {
                    currentData = mergeWithPartialDefaults(
                        outputSchema,
                        currentData,
                        partialData,
                    );

                    await validateTypes({
                        value: currentData,
                        schema: outputSchema,
                    });

                    writer.write({
                        type: 'data-artifact',
                        id,
                        data: currentData,
                    });
                },
            };
        },
    };
}
