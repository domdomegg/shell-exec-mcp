#!/usr/bin/env node
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {StreamableHTTPServerTransport} from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, {type Request, type Response} from 'express';
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

(async () => {
	if (transport === 'stdio') {
		const server = createServer();
		setupSignalHandlers(async () => server.close());

		const stdioTransport = new StdioServerTransport();
		await server.connect(stdioTransport);
		console.error('shell-exec-mcp running on stdio');
	} else if (transport === 'http') {
		const app = express();
		app.use(express.json());

		const port = parseInt(process.env.PORT || '3000', 10);
		const baseUrl = process.env.MCP_BASE_URL || `http://localhost:${port}`;

		app.post('/mcp', async (req: Request, res: Response) => {
			const server = createServer();

			try {
				const httpTransport = new StreamableHTTPServerTransport({
					sessionIdGenerator: undefined,
					enableJsonResponse: true,
				});
				await server.connect(httpTransport);

				await httpTransport.handleRequest(req, res, req.body);

				res.on('close', () => {
					void httpTransport.close();
					void server.close();
				});
			} catch (error) {
				console.error('Error handling MCP request:', error);
				if (!res.headersSent) {
					res.status(500).json({
						jsonrpc: '2.0',
						error: {code: -32603, message: 'Internal server error'},
						id: null,
					});
				}
			}
		});

		const httpServer = app.listen(port, () => {
			console.error(`shell-exec-mcp running on ${baseUrl}/mcp`);
		});

		httpServer.on('error', (err: NodeJS.ErrnoException) => {
			console.error('FATAL: Server error', err.message);
			process.exit(1);
		});

		setupSignalHandlers(async () => {
			httpServer.close();
		});
	} else {
		console.error(`Unknown transport: ${transport}. Use MCP_TRANSPORT=stdio or MCP_TRANSPORT=http`);
		process.exit(1);
	}
})();
