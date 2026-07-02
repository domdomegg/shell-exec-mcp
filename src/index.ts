import {createRequire} from 'node:module';
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerAll} from './tools/index.js';

const {version} = createRequire(__filename)('../package.json') as {version: string};

export function createServer(): McpServer {
	const server = new McpServer({
		name: 'shell-exec-mcp',
		version,
	});

	registerAll(server);

	return server;
}
