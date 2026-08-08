# Explore GitHub MCP server OAuth login flow
$outFile = Join-Path $env:TEMP 'gh_mcp_out.txt'
$errFile = Join-Path $env:TEMP 'gh_mcp_err.txt'

$p = Start-Process docker `
    -ArgumentList 'run','--rm','-e','GITHUB_OAUTH_CALLBACK_PORT=8085','-p','127.0.0.1:8085:8085','ghcr.io/github/github-mcp-server' `
    -RedirectStandardOutput $outFile `
    -RedirectStandardError $errFile `
    -NoNewWindow `
    -PassThru

Start-Sleep -Seconds 20

Write-Output '--- STDOUT ---'
if (Test-Path $outFile) { Get-Content $outFile }
Write-Output '--- STDERR ---'
if (Test-Path $errFile) { Get-Content $errFile }

# Kill the container if still running
docker ps --filter "ancestor=ghcr.io/github/github-mcp-server" -q | ForEach-Object { docker kill $_ }

Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue

Write-Output '--- DONE ---'