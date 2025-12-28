import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js';
import {spawn, type ChildProcess} from 'node:child_process';
import {z} from 'zod';
import {jsonResult} from '../utils/response.js';
import {strictSchemaWithAliases} from '../utils/schema.js';

const DEFAULT_TIMEOUT = 5000; // 5 seconds

// Background job tracking
type BackgroundJob = {
	process: ChildProcess;
	stdout: string;
	stderr: string;
	exitCode: number | null;
	startedAt: Date;
};

const backgroundJobs = new Map<string, BackgroundJob>();

function generateJobId(): string {
	return Math.random().toString(36).substring(2, 10);
}

const executeDescription = `Run a command in bash.

Returns stdout, stderr, and exit code. Default timeout is 5 seconds.

For long-running commands, set 'background: true' to run in background and get a job ID. Then use get_status to check on it.

Tips:
- Use background mode for commands that take more than a few seconds
- For file searches, use 'find' or 'grep'
- For file operations, use 'mv', 'rm', 'mkdir -p', 'stat' etc.`;

const getStatusDescription = `Check status of a background job.

Returns stdout/stderr collected so far, exit code (null if still running), and whether the job is still running.

Completed jobs are cleaned up after their status is read.`;

export function registerBash(server: McpServer): void {
	// Tool 1: execute
	server.registerTool(
		'execute',
		{
			title: 'Execute',
			description: executeDescription,
			inputSchema: strictSchemaWithAliases(
				{
					command: z.string().describe('The bash command to run'),
					timeout: z.number().optional().describe(`Timeout in milliseconds (default: ${DEFAULT_TIMEOUT})`),
					background: z.boolean().optional().describe('Run in background and return job ID'),
				},
				{},
			),
		},
		async (args) => {
			const {command} = args;
			const timeout = args.timeout ?? DEFAULT_TIMEOUT;

			// Background mode
			if (args.background) {
				const jobId = generateJobId();
				const child = spawn('bash', ['-c', command], {
					stdio: ['ignore', 'pipe', 'pipe'],
				});

				const job: BackgroundJob = {
					process: child,
					stdout: '',
					stderr: '',
					exitCode: null,
					startedAt: new Date(),
				};

				child.stdout.on('data', (data: Buffer) => {
					job.stdout += data.toString();
				});

				child.stderr.on('data', (data: Buffer) => {
					job.stderr += data.toString();
				});

				child.on('close', (code) => {
					job.exitCode = code ?? 1;
				});

				child.on('error', (err) => {
					job.stderr += `\nProcess error: ${err.message}`;
					job.exitCode = 1;
				});

				backgroundJobs.set(jobId, job);

				return jsonResult({
					jobId,
					pid: child.pid ?? 0,
				});
			}

			// Foreground mode with timeout
			return new Promise((resolve) => {
				const child = spawn('bash', ['-c', command], {
					stdio: ['ignore', 'pipe', 'pipe'],
				});

				let stdout = '';
				let stderr = '';
				let timedOut = false;

				const timeoutId = setTimeout(() => {
					timedOut = true;
					child.kill('SIGTERM');
					// Give it a moment to die gracefully, then force kill
					setTimeout(() => child.kill('SIGKILL'), 1000);
				}, timeout);

				child.stdout.on('data', (data: Buffer) => {
					stdout += data.toString();
				});

				child.stderr.on('data', (data: Buffer) => {
					stderr += data.toString();
				});

				child.on('close', (code) => {
					clearTimeout(timeoutId);

					if (timedOut) {
						stderr += `\nProcess timed out after ${timeout}ms`;
					}

					resolve(jsonResult({
						stdout,
						stderr,
						exitCode: timedOut ? 124 : (code ?? 1), // 124 is conventional timeout exit code
					}));
				});

				child.on('error', (err) => {
					clearTimeout(timeoutId);
					resolve(jsonResult({
						stdout,
						stderr: `${stderr}\nProcess error: ${err.message}`,
						exitCode: 1,
					}));
				});
			});
		},
	);

	// Tool 2: get_job_status
	server.registerTool(
		'get_job_status',
		{
			title: 'Get Job Status',
			description: getStatusDescription,
			inputSchema: strictSchemaWithAliases(
				{
					jobId: z.string().describe('The job ID returned from execute with background: true'),
				},
				{},
			),
		},
		async (args) => {
			const job = backgroundJobs.get(args.jobId);
			if (!job) {
				throw new Error(`Job not found: ${args.jobId}`);
			}

			const running = job.exitCode === null;

			// Clean up completed jobs after reading
			if (!running) {
				backgroundJobs.delete(args.jobId);
			}

			return jsonResult({
				stdout: job.stdout,
				stderr: job.stderr,
				exitCode: job.exitCode,
				running,
			});
		},
	);
}
