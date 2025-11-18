import { google } from '@ai-sdk/google';
import { Agent, RouterAgent, tool } from '@taupo/ai';
import z from 'zod';

const animalFactsAgent = new Agent({
    name: 'Animal Facts Agent',
    capabilities: 'Handles random facts about animals',
    model: google('gemini-2.5-flash'),
    instructions: `You are a animal facts agent. You are given a question and you need to answer it with a fact about animals.`,
    tools: {
        displayFact: tool({
            description: 'Display a fact about animals',
            inputSchema: z.object({
                topic: z.string(),
                fact: z.string(),
            }),
            execute: async ({ topic, fact }) => {
                return `The fact about ${topic} is... ${fact}.`;
            },
        }),
    },
});

const geographyFactsAgent = new Agent({
    name: 'Geography Facts Agent',
    capabilities: 'Handles random facts about geography',
    model: google('gemini-2.5-flash'),
    instructions: `You are a geography facts agent. You are given a question and you need to answer it with a fact about geography.`,
    tools: {
        displayFact: tool({
            description: 'Display a fact about geography',
            inputSchema: z.object({
                topic: z.string(),
                fact: z.string(),
            }),
            execute: async ({ topic, fact }) => {
                return `The fact about ${topic} is... ${fact}.`;
            },
        }),
        somethingRandom: tool({
            description: 'Something random',
            inputSchema: z.object({
                topic: z.string(),
            }),
            execute: async ({ topic }) => {
                return `Something random about ${topic} is... ${Math.random()}.`;
            },
        }),
    },
});

const historyFactsAgent = new Agent({
    name: 'History Facts Agent',
    capabilities: 'Handles random facts about history',
    model: google('gemini-2.5-flash'),
    instructions: `You are a history facts agent. You are given a question and you need to answer it with a fact about history.`,
});

export const factsAgentComplex = new RouterAgent({
    name: 'Facts Agent 2',
    model: google('gemini-2.5-flash'),
    subAgents: [animalFactsAgent, geographyFactsAgent, historyFactsAgent],
});
