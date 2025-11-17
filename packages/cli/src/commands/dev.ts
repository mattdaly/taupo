import { build } from 'tsdown';
import { resolve, dirname } from 'path';
import { existsSync } from 'fs';
import { watch } from 'chokidar';
import { startDevServer } from '../dev-server.js';
import { config } from 'dotenv';
import type { Server } from 'node:http';

interface DevOptions {
    entry: string;
    port: string;
}

let currentServer: Server | null = null;
let isRestarting = false;

async function bundleCode(entryPath: string, outputDir: string) {
    await build({
        entry: [entryPath],
        outDir: outputDir,
        format: ['esm'],
        platform: 'node',
        target: 'node18',
        sourcemap: true,
        dts: false,
        clean: true,
        external: [],
    });
}

async function startOrRestartServer(
    bundlePath: string,
    port: number,
    labPath: string,
) {
    if (isRestarting) return;
    isRestarting = true;

    try {
        // Stop current server if running
        if (currentServer) {
            console.log('');
            console.log('Restarting...');
            currentServer.close();
            currentServer = null;
            // Give it a moment to fully close
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Start new server
        currentServer = await startDevServer({
            bundlePath,
            port,
            labPath,
        });
    } finally {
        isRestarting = false;
    }
}

export async function devCommand(options: DevOptions) {
    const cwd = process.cwd();

    // Load .env file from the user's project directory
    config({ path: resolve(cwd, '.env') });

    const entryPath = resolve(cwd, options.entry);
    const outputDir = resolve(cwd, '.taupo');
    const bundlePath = resolve(outputDir, 'index.mjs');
    const port = parseInt(options.port, 10);

    // Find lab package
    const labPath = resolve(
        dirname(dirname(dirname(fileURLToPath(import.meta.url)))),
        'lab',
    );

    console.log('🌊 Taupo Dev');
    console.log('');
    console.log(`  Entry:  ${entryPath}`);
    console.log(`  Port:   ${port}`);
    console.log('');

    // Check if entry file exists
    if (!existsSync(entryPath)) {
        console.error(`❌ Error: Entry file not found: ${entryPath}`);
        process.exit(1);
    }

    // Initial build
    console.log('Building...');
    try {
        await bundleCode(entryPath, outputDir);
        console.log('✓ Build complete');
    } catch (error) {
        console.error('');
        console.error('❌ Build failed:');
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }

    // Start server
    await startOrRestartServer(bundlePath, port, labPath);

    console.log('○ Watching for file changes...');
    console.log('');

    // Watch for changes
    const srcDir = resolve(cwd, 'src');
    const watcher = watch(srcDir, {
        persistent: true,
        ignoreInitial: true,
    });

    watcher.on('change', async path => {
        console.log('');
        console.log(`File changed: ${path}`);
        console.log('Rebuilding...');

        try {
            await bundleCode(entryPath, outputDir);
            console.log('✓ Build complete');
            await startOrRestartServer(bundlePath, port, labPath);
        } catch (error) {
            console.error('');
            console.error('❌ Build failed:');
            console.error(
                error instanceof Error ? error.message : String(error),
            );
        }
    });

    // Handle cleanup
    process.on('SIGINT', () => {
        console.log('');
        console.log('Shutting down...');
        if (currentServer) {
            currentServer.close();
        }
        watcher.close();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        if (currentServer) {
            currentServer.close();
        }
        watcher.close();
        process.exit(0);
    });
}

function fileURLToPath(url: string): string {
    return url.replace('file://', '');
}
