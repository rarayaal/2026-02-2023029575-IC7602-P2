# ==============================================================================
# Script de Desinstalacion del Stack Helm en Windows (T-40)
# ==============================================================================

param (
    [string]$ReleaseName = "proxycache",
    [string]$Namespace = "proxycache"
)

Write-Host "[INFO] Desinstalando release '$ReleaseName' del namespace '$Namespace'..." -ForegroundColor Yellow
& helm uninstall $ReleaseName --namespace $Namespace
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Stack desinstalado exitosamente." -ForegroundColor Green
} else {
    Write-Host "[AVISO] La release '$ReleaseName' no se encontraba instalada o ya fue eliminada." -ForegroundColor Yellow
}
