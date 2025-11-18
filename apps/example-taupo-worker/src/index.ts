import { Taupo } from '@taupo/server';
import { factsAgent } from './agents/facts';
import { corsMiddleware } from './middleware/cors';
import { factsAgentComplex } from './agents/facts-complex';

const server = new Taupo({
    agents: {
        facts: factsAgent,
        factsComplex: factsAgentComplex,
    },
    middleware: [corsMiddleware],
});

export default server;
