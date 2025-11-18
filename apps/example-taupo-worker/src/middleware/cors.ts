import { cors } from 'hono/cors';

export const corsMiddleware = cors({
    origin: origin => {
        // Parse origin safely
        if (!origin) {
            return null;
        }

        try {
            const { hostname } = new URL(origin);

            // Allow localhost for development
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return origin;
            }
        } catch {
            // Invalid origin
        }

        // Disallow other origins
        return null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
    credentials: true,
});
