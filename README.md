# shell-exec-mcp

MCP server for executing bash commands with background job support.

## Use Cases

**Run build commands**: Execute `npm run build`, `make`, or other build tools and get the output.

**File operations**: Use `find`, `grep`, `mv`, `rm`, `mkdir -p`, `stat` etc. for file management.

**Long-running tasks**: Start servers or watch processes in background mode, check on them later.

**System info**: Run `df -h`, `ps aux`, `env` etc. to inspect the system state.

## Setup

```bash
claude mcp add shell-exec-mcp -- npx -y shell-exec-mcp
```

Or with HTTP transport:

```bash
# Start the server
MCP_TRANSPORT=http PORT=3000 npx -y shell-exec-mcp

# Add to Claude
claude mcp add --transport http shell-exec-mcp http://localhost:3000/mcp
```

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
