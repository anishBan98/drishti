# Stores the Google service-account key in both Drishti Workers (staging and production), then deletes the file.
# Usage, from the drishti folder:  powershell -ExecutionPolicy Bypass -File scripts\set-google-key.ps1
# It picks the newest drishti-preql-*.json in your Downloads folder. The key's contents are never printed.

$key = Get-ChildItem "$HOME\Downloads\drishti-preql-*.json" -ErrorAction SilentlyContinue |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $key) { Write-Host "No drishti-preql-*.json found in Downloads. Download the key first."; exit 1 }
Write-Host "Using $($key.Name)"
Get-Content -Raw $key.FullName | pnpm exec wrangler secret put GOOGLE_SA_JSON --env staging
if ($LASTEXITCODE -ne 0) { Write-Host "Staging failed; the file was kept."; exit 1 }
Get-Content -Raw $key.FullName | pnpm exec wrangler secret put GOOGLE_SA_JSON --env=""
if ($LASTEXITCODE -ne 0) { Write-Host "Production failed; the file was kept."; exit 1 }
Remove-Item $key.FullName
Write-Host "Done: stored in staging and production, and the key file is deleted."
