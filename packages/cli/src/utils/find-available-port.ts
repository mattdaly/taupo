import { createServer } from 'net';

/**
 * Checks if a port is available
 */
function isPortAvailable(port: number, host?: string): Promise<boolean> {
    return new Promise((resolve) => {
        const server = createServer();
        
        server.on('error', () => {
            resolve(false);
        });

        server.listen(port, host, () => {
            server.close(() => {
                resolve(true);
            });
        });
    });
}

/**
 * Finds the first available port starting from the given port
 * @param startPort The port to start checking from
 * @param host The host to check availability on (default: undefined - all interfaces)
 * @param maxAttempts Maximum number of ports to check (default: 10)
 */
export async function findAvailablePort(
    startPort: number,
    host?: string,
    maxAttempts: number = 10
): Promise<number> {
    let port = startPort;
    let attempts = 0;

    while (attempts < maxAttempts) {
        const available = await isPortAvailable(port, host);
        if (available) {
            return port;
        }
        port++;
        attempts++;
    }

    throw new Error(`Could not find an available port after ${maxAttempts} attempts starting from ${startPort}`);
}

