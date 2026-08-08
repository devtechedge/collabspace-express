# List all GitHub repositories
$token = $env:GITHUB_PERSONAL_ACCESS_TOKEN

Write-Output "=== Fetching GitHub Repositories ==="
Write-Output ""

# Fetch repositories (up to 100 per page)
$headers = @{ Authorization = "token $token" }
$repos = Invoke-RestMethod -Uri "https://api.github.com/user/repos?per_page=100&sort=updated" -Headers $headers

Write-Output "Total repositories: $($repos.Count)"
Write-Output ""
Write-Output "Repository names:"
Write-Output "-------------------"

$repos | ForEach-Object {
    Write-Output $_.name
}

if ($repos.Count -eq 0) {
    Write-Output "No repositories found."
}