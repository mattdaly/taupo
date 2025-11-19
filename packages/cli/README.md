# @taupo/cli

CLI tools for developing and building Taupo AI agent applications with an integrated development UI.

The Taupo CLI provides everything you need for local development and production builds of your AI agents:
- Development server with hot reload
- Integrated Lab UI for testing agents visually
- Production-ready bundling

## Features

- 🔥 **Hot Reload** - Automatic rebuilding and server restart on file changes
- 🎨 **Lab UI** - Beautiful development interface for testing agents
- ⚡ **Fast Builds** - Powered by `tsdown` for quick compilation
- 📦 **Optimized Bundling** - Production-ready builds with source maps
- 🔍 **Zero Config** - Works out of the box with sensible defaults
- 🛠️ **Flexible** - Configurable entry points and output directories

## Installation

```bash
npm install -D @taupo/cli
```

The CLI requires `@taupo/server` as a peer dependency:

```bash
npm install @taupo/server @taupo/ai ai@beta zod
```

## Quick Start

### 1. Create Your Agent Application

```typescript
// src/index.ts
import { Taupo } from '@taupo/server';
import { Agent } from '@taupo/ai';
import { google } from '@ai-sdk/google';

const factAgent = new Agent({
    name: 'Facts Agent',
    capabilities: 'Provides interesting facts',
    model: google('gemini-2.5-flash'),
    instructions: 'You are a knowledgeable facts expert.',
});

const server = new Taupo({
    agents: {
        facts: factAgent,
    },
});

export default server;
```

### 2. Start Development Server

```bash
npx taupo dev
```

This will:
1. Build your application
2. Start a local server (default port 3000)
3. Open the Lab UI for testing
4. Watch for file changes and hot reload

### 3. Build for Production

```bash
npx taupo build
```

This creates an optimized bundle in `.taupo/index.mjs` ready for deployment.

## Commands

### `taupo dev`

Start the development server with hot reload and Lab UI.

```bash
taupo dev [options]
```

**Options:**

- `-e, --entry <path>` - Entry point file (default: `./src/index.ts`)
- `-p, --port <number>` - Port to run on (default: `3000`)

**Examples:**

```bash
# Use defaults
taupo dev

# Custom entry point
taupo dev --entry ./app/server.ts

# Custom port
taupo dev --port 8080

# Both custom
taupo dev -e ./app/main.ts -p 4000
```

**What happens:**

1. Loads environment variables from `.env`
2. Bundles your TypeScript code
3. Starts HTTP server with your Taupo instance
4. Serves Lab UI at the root URL
5. Exposes agent APIs at `/agent/*` and `/agents`
6. Watches `src/` directory for changes
7. Rebuilds and restarts server automatically

**Output:**

```
🌊 Taupo Dev

  ✓ Entry: src/index.ts

🌐 Server running at:

   ➜  Lab UI:  http://localhost:3000
   ➜  API:     http://localhost:3000/agents

○ Watching for file changes...
```

### `taupo build`

Build your application for production deployment.

```bash
taupo build [options]
```

**Options:**

- `-e, --entry <path>` - Entry point file (default: `./src/index.ts`)
- `-o, --output <path>` - Output directory (default: `./.taupo`)

**Examples:**

```bash
# Use defaults
taupo build

# Custom output directory
taupo build --output ./dist

# Custom entry and output
taupo build -e ./app/main.ts -o ./build
```

**What it does:**

1. Bundles TypeScript code to ESM
2. Includes all dependencies
3. Generates source maps
4. Outputs optimized `index.mjs`

**Output:**

```
🌊 Taupo Build

  Entry:  /path/to/src/index.ts
  Output: /path/to/.taupo

⚡ Building...

✅ Build complete!

Output: .taupo/index.mjs
```

## Lab UI

The Lab UI is an integrated development environment for testing your AI agents visually.

### Features

- **Agent Explorer** - Browse all registered agents
- **Interactive Chat** - Test agents with conversational UI
- **Message History** - View full conversation context
- **Tool Inspection** - See tool calls and results in real-time
- **Streaming Display** - Visualize streaming responses
- **Agent Metadata** - Inspect agent capabilities and tools
- **Router Visualization** - See routing decisions for RouterAgents

### Accessing Lab UI

When running `taupo dev`, the Lab UI is automatically served at the root URL:

```
http://localhost:3000
```

### Using Lab UI

1. **Select an Agent** - Choose from the sidebar
2. **Send Messages** - Type in the input box
3. **View Responses** - See streamed text and tool calls
4. **Inspect Tools** - Expand tool call details
5. **Test Routing** - For RouterAgents, see which sub-agent handles the request

## Development Workflow

### Project Structure

```
my-agent-app/
├── src/
│   ├── index.ts          # Main entry (exports Taupo instance)
│   ├── agents/
│   │   ├── invoice.ts    # Invoice agent
│   │   └── customer.ts   # Customer agent
│   └── tools/
│       └── database.ts   # Shared tools
├── .env                  # Environment variables
├── package.json
└── tsconfig.json
```

### Environment Variables

Create a `.env` file in your project root:

```env
# API Keys
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here

# Custom variables
DATABASE_URL=postgresql://...
API_ENDPOINT=https://api.example.com
```

The dev server automatically loads `.env` on startup.

### Hot Reload

The dev server watches your `src/` directory and automatically:

1. Detects file changes
2. Rebuilds the bundle
3. Restarts the server
4. Preserves your port and configuration

**Example output on file change:**

```
File changed: src/agents/invoice.ts

Restarted server...
```

### TypeScript Configuration

Recommended `tsconfig.json`:

```json
{
    "extends": "@taupo/tsconfig/ts-library.json",
    "compilerOptions": {
        "outDir": "dist",
        "rootDir": "src"
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules"]
}
```

### Package.json Scripts

```json
{
    "scripts": {
        "dev": "taupo dev",
        "build": "taupo build",
        "start": "node .taupo/index.mjs"
    }
}
```

## Deployment

### Node.js

After building, run the bundle directly:

```bash
npm run build
node .taupo/index.mjs
```

Or use a process manager:

```bash
# PM2
pm2 start .taupo/index.mjs --name "taupo-app"

# Forever
forever start .taupo/index.mjs
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY src ./src
COPY tsconfig.json ./

# Build
RUN npx taupo build

# Run
CMD ["node", ".taupo/index.mjs"]
```

### Cloudflare Workers

For Cloudflare Workers, don't use the CLI build. Instead, use Wrangler directly:

```typescript
// wrangler.jsonc
{
    "main": "src/index.ts",
    "compatibility_date": "2024-01-01"
}
```

```bash
npx wrangler dev    # Development
npx wrangler deploy # Production
```

The Taupo server instance works directly with Cloudflare Workers without bundling.

### Vercel

```json
{
    "buildCommand": "taupo build",
    "outputDirectory": ".taupo",
    "installCommand": "npm install",
    "framework": null
}
```

### Platform-Specific Notes

**Cloudflare Workers, Deno Deploy, Netlify Edge:**
- Don't use `taupo build` - these platforms bundle for you
- Export your Taupo instance directly
- Use platform-specific deployment commands

**Node.js, VPS, Containers:**
- Use `taupo build` for optimized bundles
- Output includes all dependencies
- Run the `.mjs` file with Node 18+

## Build Output

The `taupo build` command generates:

```
.taupo/
├── index.mjs       # Optimized ESM bundle
└── index.mjs.map   # Source map for debugging
```

### Build Configuration

The CLI uses `tsdown` with the following settings:

- **Format:** ESM only
- **Platform:** Node.js
- **Target:** Node 18+
- **Source Maps:** Yes
- **TypeScript:** Compiled to JavaScript
- **Dependencies:** All bundled (except for platform builds)

## Troubleshooting

### Port Already in Use

```bash
# Use a different port
taupo dev --port 3001
```

### Build Errors

```bash
# Check TypeScript errors
npx tsc --noEmit

# Verify entry file exists
ls -la src/index.ts
```

### Hot Reload Not Working

- Ensure you're editing files in the `src/` directory
- Check that your editor is saving files
- Look for TypeScript compilation errors in the output

### Lab UI Not Loading

- Verify the server started successfully
- Check the console for error messages
- Ensure no firewall blocking the port
- Try accessing `http://localhost:3000/agents` directly

### Environment Variables Not Loading

- Ensure `.env` file is in project root (not in `src/`)
- Check `.env` file format (no quotes for simple values)
- Restart dev server after changing `.env`

## Advanced Configuration

### Custom Build Scripts

For advanced use cases, you can use `tsdown` directly:

```typescript
// build.ts
import { build } from 'tsdown';

await build({
    entry: ['src/index.ts'],
    outDir: 'dist',
    format: ['esm', 'cjs'],
    platform: 'node',
    target: 'node18',
    sourcemap: true,
    dts: true,
    external: ['@taupo/server', '@taupo/ai'],
});
```

### Custom Dev Server

If you need more control, create your own dev server:

```typescript
// dev.ts
import { serve } from '@hono/node-server';
import { Taupo } from '@taupo/server';
import { agent } from './src/agents/my-agent';

const server = new Taupo({
    agents: { myAgent: agent },
});

serve({
    fetch: server.fetch,
    port: 3000,
});
```

## API Reference

### CLI Options

**Global:**
- `--version` - Show version number
- `--help` - Show help

**Dev Command:**
- `-e, --entry <path>` - Entry file (default: `./src/index.ts`)
- `-p, --port <number>` - Port (default: `3000`)

**Build Command:**
- `-e, --entry <path>` - Entry file (default: `./src/index.ts`)
- `-o, --output <path>` - Output directory (default: `./.taupo`)

## Best Practices

1. **Use TypeScript** - Full type safety for agents and tools
2. **Environment Variables** - Never commit API keys, use `.env`
3. **Modular Agents** - Separate agents into individual files
4. **Testing** - Use Lab UI to test agents during development
5. **Production Build** - Always build before deploying
6. **Version Control** - Add `.taupo/` and `.env` to `.gitignore`

## Example `.gitignore`

```gitignore
# Dependencies
node_modules/

# Build output
.taupo/
dist/

# Environment
.env
.env.local

# Logs
*.log
```

## Contributing

Contributions are welcome! Please see the main repository for contribution guidelines.

## License

MIT

## Related Projects

- [@taupo/ai](../ai) - Core AI agent framework
- [@taupo/server](../server) - HTTP server for agents
- [@taupo/lab](../lab) - Development UI (bundled with CLI)
- [tsdown](https://github.com/sxzz/tsdown) - TypeScript bundler

