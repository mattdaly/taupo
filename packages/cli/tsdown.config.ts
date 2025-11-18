import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: ['src/index.ts'],
    outDir: 'dist',
    format: ['esm'],
    platform: 'node',
    sourcemap: false,
    dts: false,
    target: 'node18',
    noExternal: [
        'commander',
        'chokidar',
        'dotenv',
        'tsdown',
        '@hono/node-server',
    ],
});
