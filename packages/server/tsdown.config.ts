import { defineConfig } from 'tsdown';

export default defineConfig({
    entry: ['src/index.ts'],
    outDir: 'dist',
    format: ['esm', 'cjs'],
    platform: 'node',
    sourcemap: true,
    dts: true,
    target: 'es2018',
});
