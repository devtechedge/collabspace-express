# Send an MCP initialize request to the GitHub MCP server over stdio to trigger OAuth URL output
$initRequest = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}'

# Pipe initialize request then keep stdin open briefly
$requestWithDelay = $initRequest + "`n"
$requestWithDelay | docker run -i --rm `
    -e GITHUB_OAUTH_CALLBACK_PORT=8085 `
    -p "127.0.0.1:8085:8085" `
    ghcr.io/github/github-mcp-server 2>&1

Write-Output "--- EXIT CODE: $LASTEXITCODE ---"