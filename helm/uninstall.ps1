# ==============================================================================
# Script de Desinstalacion del Stack Helm en Windows (T-40)
# ==============================================================================

param (
    [string]$ReleaseName = "proxycache",
    [string]$Namespace = "proxycache",
    [switch]$DeletePVC,
    [switch]$DeleteNamespace
)

$ErrorActionPreference = 'SilentlyContinue'

Write-Host "[INFO] Desinstalando release '$ReleaseName' del namespace '$Namespace'..." -ForegroundColor Yellow
& helm uninstall $ReleaseName --namespace $Namespace
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Release '$ReleaseName' desinstalada exitosamente." -ForegroundColor Green
} else {
    Write-Host "[AVISO] La release '$ReleaseName' no se encontraba instalada o ya fue eliminada." -ForegroundColor Yellow
}

# Limpieza condicional de PVCs y namespace si kubectl esta disponible
$kubectlVer = & kubectl version --client 2>$null
if ($LASTEXITCODE -eq 0) {
    if ($DeletePVC.IsPresent) {
        Write-Host "[AVISO] Parametro -DeletePVC detectado. Eliminando PersistentVolumeClaims asociados a '$ReleaseName'..." -ForegroundColor Yellow
        & kubectl delete pvc -l "app.kubernetes.io/instance=$ReleaseName" -n $Namespace --ignore-not-found=true 2>$null
        & kubectl delete pvc -l "app=$ReleaseName" -n $Namespace --ignore-not-found=true 2>$null
        & kubectl delete pvc "$ReleaseName-cache" -n $Namespace --ignore-not-found=true 2>$null
        Write-Host "[OK] PersistentVolumeClaims eliminados." -ForegroundColor Green
    } else {
        Write-Host "[INFO] Los PersistentVolumeClaims (PVCs) se han conservado por defecto para proteger los datos persistentes de la cache y base de datos." -ForegroundColor Cyan
        Write-Host "       (Para eliminarlos explicitamente, ejecute el script con el parametro -DeletePVC)" -ForegroundColor Gray
    }

    if ($DeleteNamespace.IsPresent) {
        Write-Host "[AVISO] Parametro -DeleteNamespace detectado. Eliminando namespace '$Namespace'..." -ForegroundColor Yellow
        & kubectl delete namespace $Namespace --ignore-not-found=true
        Write-Host "[OK] Namespace '$Namespace' eliminado." -ForegroundColor Green
    }
}

Write-Host "[OK] Proceso de desinstalacion finalizado." -ForegroundColor Green
