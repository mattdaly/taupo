import { defineConfig } from 'tsdown';

export default defineConfig([
    // Server library - keep dependencies external
    {
        entry: ['src/index.ts'],
        outDir: 'dist',
        format: ['esm', 'cjs'],
        platform: 'node',
        sourcemap: true,
        dts: true,
        target: 'es2018',
    },
    // CLI binary - bundle all dependencies except those shared with server
    {
        entry: ['src/cli/index.ts'],
        outDir: 'dist/cli',
        format: ['esm'],
        platform: 'node',
        sourcemap: false,
        dts: false, // CLI doesn't need type definitions
        target: 'node18',
        noExternal: [
            // Bundle CLI-specific dependencies
            'commander',
            'chokidar',
            'dotenv',
            'tsdown',
            '@hono/node-server', // Only used by CLI dev server
        ],
    },
]);
