import { Taupo } from '@taupo/server';
import { factsAgent } from './agents/facts';
import { corsMiddleware } from './middleware/cors';

const server = new Taupo({
    agents: {
        facts: factsAgent,
    },
    middleware: [corsMiddleware],
});

export default server;
