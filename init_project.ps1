$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
Write-Output "1. Initializing React+Vite app in 'client' directory..."
npx -y create-vite@latest client --template react-ts --no-interactive --overwrite

Write-Output "2. Installing client libraries (socket.io-client, lucide-react)..."
npm install socket.io-client lucide-react --workspace=client --save

Write-Output "3. Installing server dev dependencies..."
# server package.json is already created, we just run npm install at root to install everything
npm install
