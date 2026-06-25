# shell-exec-mcp

MCP server for executing bash commands with background job support.

## Use Cases

**Run build commands**: Execute `npm run build`, `make`, or other build tools and get the output.

**File operations**: Use `find`, `grep`, `mv`, `rm`, `mkdir -p`, `stat` etc. for file management.

**Long-running tasks**: Start servers or watch processes in background mode, check on them later.

**System info**: Run `df -h`, `ps aux`, `env` etc. to inspect the system state.

## Setup

Follow the instructions on [install-mcp](https://adamjones.me/install-mcp/?config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsInNoZWxsLWV4ZWMtbWNwIl0sIm5hbWUiOiJzaGVsbC1leGVjIn0=), which generates the right config for your MCP client (Claude Code, Claude Desktop, Cursor, Cline, VS Code, and more).

## Tools

| Tool | Description |
|------|-------------|
| `execute` | Run a bash command (with optional timeout and background mode) |
| `get_job_status` | Check status of a background job |

## Contributing

Pull requests are welcomed on GitHub! To get started:

1. Install Git and Node.js
2. Clone the repository
3. Install dependencies with `npm install`
4. Run `npm run test` to run tests
5. Build with `npm run build`

## Releases

Versions follow the [semantic versioning spec](https://semver.org/).

To release:

1. Use `npm version <major | minor | patch>` to bump the version
2. Run `git push --follow-tags` to push with tags
3. Wait for GitHub Actions to publish to the NPM registry.
