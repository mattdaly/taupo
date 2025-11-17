import {
    tool as aiTool,
    type JSONValue,
    type Tool as AiTool,
    type ToolCallOptions as AiToolCallOptions,
} from 'ai';
import { type Writer } from '../agent/types';
import { type DistributiveOmit } from '../types';

export interface ToolCallContextWithWriter extends ToolCallContext {
    _writer: Writer;
}

/**
 * Extended experimental context that includes our custom runtime context
 * Refers to experimental_context
 */
export interface ToolCallContext {}

/**
 * Additional options that are sent into each tool call
 */
export interface ToolCallOptions
    extends Omit<AiToolCallOptions, 'experimental_context'> {
    experimental_context: ToolCallContext;
    writer?: Writer;
}

/**
 * A tool contains the description and the schema of the input that the tool expects. This enables the language model to generate the input.
 * The tool can also contain an optional execute function for the actual execution function of the tool.
 */
export type Tool<
    INPUT extends JSONValue | unknown | never = any,
    OUTPUT extends JSONValue | unknown | never = any,
> = DistributiveOmit<AiTool<INPUT, OUTPUT>, 'execute'> & {
    execute: (
        input: INPUT,
        options: ToolCallOptions,
    ) => AsyncIterable<OUTPUT> | PromiseLike<OUTPUT> | OUTPUT;
};

/**
 * Helper function for inferring the execute args of a tool
 */
export function tool<
    INPUT extends JSONValue | unknown | never = any,
    OUTPUT extends JSONValue | unknown | never = any,
>(config: Tool<INPUT, OUTPUT>) {
    async function execute(input: INPUT, options: ToolCallOptions) {
        const { _writer, ...experimental_context } =
            options.experimental_context as ToolCallContextWithWriter;

        return config.execute(input, {
            ...options,
            experimental_context,
            writer: _writer,
        });
    }

    return aiTool<INPUT, OUTPUT>({ ...(config as any), execute });
}
