# Limpia deployments de GitHub Pages dejando solo los ultimos 2
# Uso:  $env:GH_TOKEN="ghp_xxx" ; .\clean-deployments.ps1
#   o:  .\clean-deployments.ps1 -Token ghp_xxx
param([string]$Token = $env:GH_TOKEN)
if (-not $Token) { $Token = $env:CAMISAS_TOKEN }
if (-not $Token) {
  $tokFile = Join-Path $PSScriptRoot "token.txt"
  if (Test-Path $tokFile) { $Token = (Get-Content $tokFile -Raw).Trim() }
}
if (-not $Token) {
  Write-Host "No hay token. Ponlo en `$env:GH_TOKEN o crea token.txt (no se sube al repo) con el ghp_... " -ForegroundColor Yellow
  Write-Host "Crea uno en: https://github.com/settings/tokens/new  scope: repo" -ForegroundColor Cyan
  exit 1
}
$repo = "SamirPxrreo/CAMISASIUB"
$headers = @{Authorization="Bearer $Token"; "User-Agent"="clean-deployments"}
try { $deps = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/deployments?per_page=100" -Headers $headers } catch { Write-Host "Error listando: $_" -ForegroundColor Red; exit 1 }
Write-Host "Deployments actuales: $($deps.Count)"
if ($deps.Count -le 2) { Write-Host "Ya hay 2 o menos, nada que borrar." -ForegroundColor Green; exit 0 }
$sorted = $deps | Sort-Object { [datetime]$_.created_at } -Descending
$toKeep = $sorted | Select-Object -First 2
$toDelete = $sorted | Select-Object -Skip 2
Write-Host "Mantener:" -ForegroundColor Green
$toKeep | ForEach-Object { Write-Host "  $($_.id) $($_.created_at) $($_.sha.Substring(0,7))" }
Write-Host "Borrar $($toDelete.Count):" -ForegroundColor Yellow
foreach ($d in $toDelete) {
  $id = $d.id
  Write-Host " -> $id ..."
  try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/deployments/$id/statuses" -Headers (@{Authorization="Bearer $Token"; "Content-Type"="application/json"; "User-Agent"="clean-deployments"}) -Method POST -Body '{"state":"inactive"}' | Out-Null
  } catch { Write-Host "   warn inactive: $_" -ForegroundColor DarkYellow }
  Start-Sleep -Milliseconds 300
  try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/deployments/$id" -Headers $headers -Method DELETE | Out-Null
    Write-Host "   borrado" -ForegroundColor Green
  } catch { Write-Host "   err delete: $_" -ForegroundColor Red }
}
Write-Host "Listo." -ForegroundColor Green
