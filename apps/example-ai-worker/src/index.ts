import { Hono } from 'hono';
import { createAgentUIStreamResponse } from '@taupo/ai';
import { corsMiddleware } from './middleware/cors';
import { factsAgent } from './agents/facts';

const app = new Hono();

// middleware
app.use('*', corsMiddleware);

// agents
app.post('/facts', async function (ctx) {
    const { messages } = await ctx.req.json();

    return createAgentUIStreamResponse({
        agent: factsAgent,
        messages,
    });
});

export default app;
