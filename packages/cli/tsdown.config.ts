import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: ['src/index.ts'],
    exports: true,
    format: ['esm'],
    platform: 'node',
    sourcemap: true,
    dts: false,
    target: 'node18',
});
