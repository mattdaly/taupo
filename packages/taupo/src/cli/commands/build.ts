import { build } from 'tsdown';
import { resolve } from 'path';
import { existsSync } from 'fs';

interface BuildOptions {
    entry: string;
    output: string;
}

export async function buildCommand(options: BuildOptions) {
    const cwd = process.cwd();
    const entryPath = resolve(cwd, options.entry);
    const outputDir = resolve(cwd, options.output);

    console.log('🌊 Taupo Build');
    console.log('');
    console.log(`  Entry:  ${entryPath}`);
    console.log(`  Output: ${outputDir}`);
    console.log('');

    // Check if entry file exists
    if (!existsSync(entryPath)) {
        console.error(`❌ Error: Entry file not found: ${entryPath}`);
        process.exit(1);
    }

    try {
        console.log('⚡ Building...');

        await build({
            entry: [entryPath],
            outDir: outputDir,
            format: ['esm'],
            platform: 'node',
            target: 'node18',
            sourcemap: true,
            dts: false,
            clean: true,
            // Bundle all dependencies except workspace packages
            external: [],
        });

        console.log('');
        console.log('✅ Build complete!');
        console.log('');
        console.log(`Output: ${outputDir}/index.mjs`);
    } catch (error) {
        console.error('');
        console.error('❌ Build failed:');
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

