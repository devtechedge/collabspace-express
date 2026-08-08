$env:PATH = "C:\Program Files\nodejs;" + $env:PATH
$env:PRISMA_CLIENT_ENGINE_TYPE = "binary"
cd server
Write-Output "Running Prisma Migration..."
npx prisma migrate dev --name init
Write-Output "Generating Prisma Client..."
npx prisma generate
