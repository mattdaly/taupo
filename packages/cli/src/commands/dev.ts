import { build } from 'tsdown';
import { resolve, dirname, relative } from 'path';
import { existsSync } from 'fs';
import { watch } from 'chokidar';
import { config as loadEnv } from 'dotenv';
import { createRequire } from 'module';
import { startDevServer } from '../dev-server.js';
import { findAvailablePort } from '../utils/find-available-port.js';

interface DevOptions {
    entry: string;
    port: string;
}

let currentServer: any | null = null;
let isRestarting = false;

// Simple spinner implementation
class Spinner {
    private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    private currentFrame = 0;
    private interval: NodeJS.Timeout | null = null;
    private text: string = '';

    start(text: string) {
        this.text = text;
        this.currentFrame = 0;
        process.stdout.write(`${this.frames[0]} ${text}`);

        this.interval = setInterval(() => {
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
            process.stdout.write(
                `\r${this.frames[this.currentFrame]} ${this.text}`,
            );
        }, 80);
    }

    succeed(text: string) {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        process.stdout.write(`\r  ✓ ${text}\n`);
    }

    fail(text: string) {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        process.stdout.write(`\r  ✗ ${text}\n`);
    }
}

async function bundleCode(entryPath: string, outputDir: string) {
    // Capture stdout/stderr to suppress tsdown output
    const originalWrite = process.stdout.write.bind(process.stdout);
    const originalErrWrite = process.stderr.write.bind(process.stderr);
    let capturedOutput = '';

    // Suppress output during build
    process.stdout.write = (chunk: any) => {
        capturedOutput += chunk;
        return true;
    };
    process.stderr.write = (chunk: any) => {
        capturedOutput += chunk;
        return true;
    };

    try {
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
    } finally {
        // Restore output
        process.stdout.write = originalWrite;
        process.stderr.write = originalErrWrite;
    }
}

async function startOrRestartServer(
    bundlePath: string,
    port: number,
    labPath: string,
    isInitial: boolean = true,
) {
    if (isRestarting) return;
    isRestarting = true;

    try {
        // Stop current server if running
        if (currentServer) {
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
            silent: !isInitial,
        });

        // Show restart confirmation if not initial
        if (!isInitial) {
            console.log('');
            console.log('Restarted server...');
        }
    } finally {
        isRestarting = false;
    }
}

export async function devCommand(options: DevOptions) {
    const cwd = process.cwd();

    // Load .env file from the user's project directory
    loadEnv({ path: resolve(cwd, '.env') });

    const entryPath = resolve(cwd, options.entry);
    const relativeEntry = relative(cwd, entryPath);
    const outputDir = resolve(cwd, '.taupo');
    const bundlePath = resolve(outputDir, 'index.mjs');
    const requestedPort = parseInt(options.port, 10);
    const port = await findAvailablePort(requestedPort);

    if (port !== requestedPort) {
        console.log(
            `⚠️  Port ${requestedPort} is in use, using ${port} instead\n`,
        );
    }

    // Resolve @taupo/lab package from node_modules
    const require = createRequire(import.meta.url);
    const labPackageJson = require.resolve('@taupo/lab/package.json');
    const labPath = dirname(labPackageJson);

    console.log(`🌊 Taupo Dev\n\n`);

    // Check if entry file exists
    if (!existsSync(entryPath)) {
        console.error(`❌ Error: Entry file not found: ${entryPath}`);
        process.exit(1);
    }

    // Initial build with spinner
    const spinner = new Spinner();
    spinner.start('Building...');
    try {
        await bundleCode(entryPath, outputDir);
        spinner.succeed(`Entry: ${relativeEntry}`);
    } catch (error) {
        spinner.fail('Build failed');
        console.error('');
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
    }

    // Start server
    await startOrRestartServer(bundlePath, port, labPath);

    console.log('');
    console.log('○ Watching for file changes...');

    // Watch for changes
    const srcDir = resolve(cwd, 'src');
    const watcher = watch(srcDir, {
        persistent: true,
        ignoreInitial: true,
    });

    watcher.on('change', async path => {
        const relativePath = relative(cwd, path);
        console.log('');
        console.log(`File changed: ${relativePath}`);

        try {
            await bundleCode(entryPath, outputDir);
            await startOrRestartServer(bundlePath, port, labPath, false);
        } catch (error) {
            console.error('Build failed');
            console.error('');
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
