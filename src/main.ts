#!/usr/bin/env node
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import type {Transport} from '@modelcontextprotocol/sdk/shared/transport.js';
import {createServer} from './index.js';

function setupSignalHandlers(cleanup: () => Promise<void>): void {
	process.on('SIGINT', async () => {
		await cleanup();
		process.exit(0);
	});
	process.on('SIGTERM', async () => {
		await cleanup();
		process.exit(0);
	});
}

const transport = process.env.MCP_TRANSPORT || 'stdio';

if (transport !== 'stdio') {
	console.error(`Unsupported transport: ${transport}. shell-exec-mcp only supports stdio. HTTP transport was removed because it exposed shell command execution without authentication; to serve it over HTTP, put a stdio-to-HTTP proxy with authentication in front of it.`);
	process.exit(1);
}

(async () => {
	const server = createServer();
	setupSignalHandlers(async () => server.close());

	const stdioTransport = new StdioServerTransport();
	await server.connect(stdioTransport as Transport);
	console.error('shell-exec-mcp running on stdio');
})();
