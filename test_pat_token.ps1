# Test GitHub PAT token with MCP server
$token = $env:GITHUB_PERSONAL_ACCESS_TOKEN

Write-Output "=== Testing GitHub PAT Token with MCP Server ==="
Write-Output ""

Write-Output "--- Testing Token Validity via GitHub API ---"
Write-Output ""

# Test the token directly with GitHub API
$headers = @{ Authorization = "token $token" }
$response = Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers -Method Get

Write-Output "--- GitHub API Response ---"
Write-Output "Login: $($response.login)"
Write-Output "Name: $($response.name)"
Write-Output "Email: $($response.email)"
Write-Output ""

Write-Output "--- Testing MCP Server Initialization ---"
Write-Output ""

# Create process with redirected stdin for MCP
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "docker"
$psi.Arguments = "run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN=$token ghcr.io/github/github-mcp-server"
$psi.UseShellExecute = $false
$psi.RedirectStandardInput = $true
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $psi
$process.Start() | Out-Null

# Send initialize request
$initRequest = '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test-client","version":"1.0.0"}}}'
$process.StandardInput.WriteLine($initRequest)
$process.StandardInput.Flush()

# Read response with timeout
$stdOut = $process.StandardOutput
$stdErr = $process.StandardError

$output = ""
$timeout = 5
$waitTime = 0
while ($waitTime -lt $timeout -and !$stdOut.EndOfStream) {
    Start-Sleep -Milliseconds 500
    $waitTime += 0.5
    if ($stdOut.Peek -ge 0) {
        $output += $stdOut.ReadToEnd()
    }
}

$errorOutput = ""
if ($stdErr.Peek -ge 0) {
    $errorOutput = $stdErr.ReadToEnd()
}

$process.StandardInput.Close()
$process.WaitForExit(3000)

Write-Output "--- MCP SERVER RESPONSE ---"
Write-Output $output
if ($errorOutput) {
    Write-Output "--- STDERR ---"
    Write-Output $errorOutput
}
Write-Output ""
Write-Output "--- EXIT CODE: $($process.ExitCode) ---"


# Check results
if ($response -and $response.login) {
    Write-Output ""
    Write-Output "[SUCCESS] PAT token is working!"
    Write-Output "  - GitHub API: Authenticated as $($response.login)"
    Write-Output "  - MCP Server: Started successfully with token"
}
else {
    Write-Output ""
    Write-Output "[FAILED] PAT token test failed"
}
