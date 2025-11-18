import { google } from '@ai-sdk/google';
import { Agent } from '@taupo/ai';

export const factsAgent = new Agent({
    name: 'Facts Agent',
    capabilities: 'Handles random facts about anything',
    model: google('gemini-2.5-flash'),
    instructions: `You are a facts agent. You are given a question and you need to answer it with a fact.`,
});
