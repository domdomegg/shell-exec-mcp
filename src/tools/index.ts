import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerBash} from './bash.js';

export function registerAll(server: McpServer): void {
	registerBash(server);
}
