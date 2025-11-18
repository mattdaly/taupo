import { cors } from 'hono/cors';

export const corsMiddleware = cors({
    origin: origin => {
        if (!origin) {
            return null;
        }

        try {
            const { hostname } = new URL(origin);

            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return origin;
            }
        } catch {
            // Invalid origin
        }

        return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    credentials: true,
});
