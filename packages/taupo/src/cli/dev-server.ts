import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { resolve } from 'path';
import { readFileSync } from 'fs';

interface DevServerOptions {
    bundlePath: string;
    port: number;
    labPath: string;
    silent?: boolean;
}

export async function startDevServer(options: DevServerOptions): Promise<any> {
    const app = new Hono();

    // Dynamically import user's bundled Taupo instance
    const userModule = await import(`${options.bundlePath}?t=${Date.now()}`);
    const userTaupo = userModule.default;

    if (!userTaupo || typeof userTaupo.fetch !== 'function') {
        throw new Error(
            'Invalid Taupo instance. Make sure your entry file exports a Taupo server as default.',
        );
    }

    // Forward /api/* routes to user's Taupo instance (strip /api prefix)
    app.use('/api/*', async c => {
        const path = c.req.path.replace(/^\/api/, '');
        const url = new URL(c.req.url);
        url.pathname = path;

        const newRequest = new Request(url.toString(), {
            method: c.req.method,
            headers: c.req.raw.headers,
            body: c.req.raw.body,
        });

        return userTaupo.fetch(newRequest);
    });

    // Serve Lab static files
    const labOutPath = resolve(options.labPath, 'out');
    const indexHtmlPath = resolve(labOutPath, 'index.html');

    // Serve static assets (with exact paths)
    app.use(
        '/*',
        serveStatic({
            root: labOutPath,
        }),
    );

    // Fallback to index.html for client-side routing (SPA)
    app.use('/*', async c => {
        const indexHtml = readFileSync(indexHtmlPath, 'utf-8');
        return c.html(indexHtml);
    });

    // Start server and wait for it to be ready
    return new Promise(resolve => {
        const server = serve(
            {
                fetch: app.fetch,
                port: options.port,
            },
            info => {
                if (!options.silent) {
                    console.log(`  ✓ Server: http://localhost:${info.port}`);
                }
                resolve(server);
            },
        );
    });
}
