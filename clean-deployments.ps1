# ============================================================================
#  Limpia deployments de GitHub Pages dejando 3:
#     1) el MAS VIEJO  -> ancla / linea base. NUNCA se borra.
#     2) el PENULTIMO  -> rollback de un paso atras
#     3) el ULTIMO     -> el que esta en vivo ahora
#  Los del medio se eliminan.
#
#  Como el mas viejo nunca se borra, queda anclado para siempre y el script
#  se estabiliza: despues de cada push deja 3 y ya.
#
#  Uso:  $env:GH_TOKEN="ghp_xxx" ; .\clean-deployments.ps1
#    o:  .\clean-deployments.ps1 -Token ghp_xxx
# ============================================================================
param(
  [string]$Token = $env:GH_TOKEN,
  [int]$Total = 3
)
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
if ($Total -lt 3) { Write-Host "-Total debe ser 3 o mas (viejo + penultimo + ultimo)." -ForegroundColor Yellow; exit 1 }

$repo = "SamirPxrreo/CAMISASIUB"
$headers = @{Authorization="Bearer $Token"; "User-Agent"="clean-deployments"}
try { $deps = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/deployments?per_page=100" -Headers $headers }
catch { Write-Host "Error listando: $_" -ForegroundColor Red; exit 1 }

# @() por si la API devuelve uno solo y PowerShell lo desenvuelve
$deps = @($deps)
Write-Host "Deployments actuales: $($deps.Count)"
if ($deps.Count -le $Total) {
  Write-Host "Ya hay $Total o menos, nada que borrar." -ForegroundColor Green
  exit 0
}

# Del mas nuevo (indice 0) al mas viejo (indice Count-1)
$sorted = $deps | Sort-Object { [datetime]$_.created_at } -Descending

# Se conservan: el ultimo, el penultimo y el mas viejo.
$keepIds = @{}
$keepIds[$sorted[0].id] = $true                        # el ULTIMO (vivo)
$keepIds[$sorted[1].id] = $true                        # el PENULTIMO
$keepIds[$sorted[$sorted.Count - 1].id] = $true        # el MAS VIEJO (ancla)

$toKeep = @($sorted | Where-Object { $keepIds[$_.id] })
$toDelete = @($sorted | Where-Object { -not $keepIds[$_.id] })

Write-Host "Mantener ($($toKeep.Count)):" -ForegroundColor Green
Write-Host "  $($sorted[0].created_at) $($sorted[0].sha.Substring(0,7))  <- ULTIMO (en vivo)" -ForegroundColor DarkGreen
Write-Host "  $($sorted[1].created_at) $($sorted[1].sha.Substring(0,7))  <- PENULTIMO (rollback)" -ForegroundColor DarkGreen
Write-Host "  $($sorted[$sorted.Count-1].created_at) $($sorted[$sorted.Count-1].sha.Substring(0,7))  <- MAS VIEJO (ancla)" -ForegroundColor DarkGreen

Write-Host "Borrar $($toDelete.Count):" -ForegroundColor Yellow
$fallos = 0
foreach ($d in $toDelete) {
  $id = $d.id
  Write-Host " -> $id ($($d.created_at) $($d.sha.Substring(0,7)))"
  # GitHub no deja borrar un deployment "active": primero se marca inactivo.
  try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/deployments/$id/statuses" -Headers (@{Authorization="Bearer $Token"; "Content-Type"="application/json"; "User-Agent"="clean-deployments"}) -Method POST -Body '{"state":"inactive"}' | Out-Null
  } catch { Write-Host "   warn inactive: $_" -ForegroundColor DarkYellow }
  Start-Sleep -Milliseconds 300
  try {
    Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/deployments/$id" -Headers $headers -Method DELETE | Out-Null
    Write-Host "   borrado" -ForegroundColor Green
  } catch {
    # 422 = era el active del environment (el sitio en vivo). No se toca.
    Write-Host "   err delete: $_" -ForegroundColor Red
    $fallos++
  }
}

# Verificacion final
try {
  $final = @((Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/deployments?per_page=100" -Headers $headers))
  Write-Host ""
  Write-Host "Quedaron $($final.Count):" -ForegroundColor Cyan
  $final | Sort-Object { [datetime]$_.created_at } | ForEach-Object {
    Write-Host "  $($_.created_at) $($_.sha.Substring(0,7))"
  }
} catch { Write-Host "No se pudo verificar el resultado: $_" -ForegroundColor DarkYellow }

if ($fallos -gt 0) { Write-Host "Termino con $fallos fallo(s)." -ForegroundColor Yellow; exit 2 }
Write-Host "Listo." -ForegroundColor Green
