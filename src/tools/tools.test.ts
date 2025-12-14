import {
	describe, it, expect, vi, beforeEach,
} from 'vitest';
import {type McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {registerAll} from './index.js';

describe('tool registration', () => {
	let server: McpServer;
	let registeredTools: Map<string, {meta: unknown; handler: (args: unknown) => Promise<unknown>}>;

	beforeEach(() => {
		registeredTools = new Map();

		server = {
			registerTool: vi.fn((name: string, meta: unknown, handler: (args: unknown) => Promise<unknown>) => {
				registeredTools.set(name, {meta, handler});
			}),
		} as unknown as McpServer;

		registerAll(server);
	});

	it('registers all expected tools', () => {
		const expectedTools = ['execute', 'get_job_status'];

		for (const toolName of expectedTools) {
			expect(registeredTools.has(toolName), `Tool ${toolName} should be registered`).toBe(true);
		}
	});

	it('all tools have title and description', () => {
		for (const [name, tool] of registeredTools) {
			const meta = tool.meta as {title?: string; description?: string};
			expect(meta.title, `Tool ${name} should have a title`).toBeDefined();
			expect(meta.description, `Tool ${name} should have a description`).toBeDefined();
			expect(meta.title!.length, `Tool ${name} title should not be empty`).toBeGreaterThan(0);
			expect(meta.description!.length, `Tool ${name} description should not be empty`).toBeGreaterThan(0);
		}
	});

	it('all tools have input schema', () => {
		for (const [name, tool] of registeredTools) {
			const meta = tool.meta as {inputSchema?: unknown};
			expect(meta.inputSchema, `Tool ${name} should have inputSchema`).toBeDefined();
		}
	});
});

describe('execute tool', () => {
	let handler: (args: {command: string; timeout?: number; background?: boolean}) => Promise<unknown>;

	beforeEach(() => {
		const registeredTools = new Map<string, {meta: unknown; handler: typeof handler}>();

		const server = {
			registerTool: vi.fn((name: string, meta: unknown, h: typeof handler) => {
				registeredTools.set(name, {meta, handler: h});
			}),
		} as unknown as McpServer;

		registerAll(server);
		handler = registeredTools.get('execute')!.handler;
	});

	it('runs a simple command', async () => {
		const result = await handler({command: 'echo hello'}) as {structuredContent: {stdout: string; stderr: string; exitCode: number}};

		expect(result.structuredContent.stdout).toBe('hello\n');
		expect(result.structuredContent.stderr).toBe('');
		expect(result.structuredContent.exitCode).toBe(0);
	});

	it('captures stderr', async () => {
		const result = await handler({command: 'echo error >&2'}) as {structuredContent: {stdout: string; stderr: string; exitCode: number}};

		expect(result.structuredContent.stdout).toBe('');
		expect(result.structuredContent.stderr).toBe('error\n');
		expect(result.structuredContent.exitCode).toBe(0);
	});

	it('returns exit code for failed commands', async () => {
		const result = await handler({command: 'exit 42'}) as {structuredContent: {stdout: string; stderr: string; exitCode: number}};

		expect(result.structuredContent.exitCode).toBe(42);
	});

	it('times out long-running commands', async () => {
		const result = await handler({command: 'sleep 10', timeout: 100}) as {structuredContent: {stdout: string; stderr: string; exitCode: number}};

		expect(result.structuredContent.exitCode).toBe(124);
		expect(result.structuredContent.stderr).toContain('timed out');
	});

	it('runs commands in background', async () => {
		const result = await handler({command: 'echo bg', background: true}) as {structuredContent: {jobId: string; pid: number}};

		expect(result.structuredContent.jobId).toBeDefined();
		expect(result.structuredContent.pid).toBeGreaterThan(0);
	});
});

describe('get_job_status tool', () => {
	let executeHandler: (args: {command: string; background?: boolean}) => Promise<unknown>;
	let statusHandler: (args: {jobId: string}) => Promise<unknown>;

	beforeEach(() => {
		const registeredTools = new Map<string, {meta: unknown; handler: (args: unknown) => Promise<unknown>}>();

		const server = {
			registerTool: vi.fn((name: string, meta: unknown, h: (args: unknown) => Promise<unknown>) => {
				registeredTools.set(name, {meta, handler: h});
			}),
		} as unknown as McpServer;

		registerAll(server);
		executeHandler = registeredTools.get('execute')!.handler as typeof executeHandler;
		statusHandler = registeredTools.get('get_job_status')!.handler as typeof statusHandler;
	});

	it('returns status of a background job', async () => {
		const execResult = await executeHandler({command: 'echo done', background: true}) as {structuredContent: {jobId: string}};
		const {jobId} = execResult.structuredContent;

		// Wait a bit for the command to complete
		await new Promise((resolve) => {
			setTimeout(resolve, 100);
		});

		const statusResult = await statusHandler({jobId}) as {structuredContent: {stdout: string; running: boolean; exitCode: number}};

		expect(statusResult.structuredContent.stdout).toBe('done\n');
		expect(statusResult.structuredContent.running).toBe(false);
		expect(statusResult.structuredContent.exitCode).toBe(0);
	});

	it('throws for unknown job ID', async () => {
		await expect(statusHandler({jobId: 'nonexistent'})).rejects.toThrow('Job not found');
	});
});
