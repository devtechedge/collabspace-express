$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
Write-Output "=== Testing Server Compilation ==="
cd server
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Server build failed!"
    exit 1
}

Write-Output "=== Testing Client Compilation ==="
cd ../client
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Client build failed!"
    exit 1
}

Write-Output "=== All builds successful! ==="
