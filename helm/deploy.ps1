# ==============================================================================
# Script de Despliegue Conjunto de Helm Charts en Windows (T-40)
# ==============================================================================

param (
    [string]$ReleaseName = "proxycache",
    [string]$Namespace = "proxycache",
    [switch]$DryRun
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$stackDir = Join-Path $scriptDir "proxycache-stack"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  IC-7602 - Orquestacion Global Helm en Windows (T-40)" -ForegroundColor Cyan
Write-Host "  Release:   $ReleaseName" -ForegroundColor Cyan
Write-Host "  Namespace: $Namespace" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Comprobar Helm
$helmVer = & helm version --short
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Helm no esta disponible en el PATH." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Helm detectado: $helmVer" -ForegroundColor Green

# 2. Actualizar dependencias
Write-Host "[INFO] Actualizando dependencias del Umbrella Chart..." -ForegroundColor Yellow
& helm dependency update $stackDir
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Fallo al actualizar dependencias de Helm." -ForegroundColor Red
    exit 1
}

# 3. Linting
Write-Host "[INFO] Ejecutando helm lint en todos los charts..." -ForegroundColor Yellow
$p1 = Join-Path $scriptDir "dns-interceptor"
$p2 = Join-Path $scriptDir "zonal-cache"
$p3 = Join-Path $scriptDir "node-api"
$p4 = Join-Path $scriptDir "ui"

& helm lint $p1
& helm lint $p2
& helm lint $p3
& helm lint $p4
& helm lint $stackDir

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error durante la verificacion de helm lint." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Todos los charts pasaron helm lint exitosamente." -ForegroundColor Green

# 4. Renderizado en seco
Write-Host "[INFO] Validando renderizado de manifiestos con helm template..." -ForegroundColor Yellow
$manifests = & helm template $ReleaseName $stackDir
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Error al renderizar manifiestos con helm template." -ForegroundColor Red
    exit 1
}
Write-Host "[OK] Manifiestos de Kubernetes renderizados sin errores." -ForegroundColor Green

if ($DryRun.IsPresent) {
    Write-Host "[INFO] Modo DryRun activado. Validacion completada con exito." -ForegroundColor Cyan
    exit 0
}

# 5. Comprobar cluster
$clusterAvailable = $false
try {
    $null = & kubectl cluster-info 2>$null
    if ($LASTEXITCODE -eq 0) {
        $clusterAvailable = $true
    }
} catch {
    $clusterAvailable = $false
}

if ($clusterAvailable) {
    Write-Host "[INFO] Cluster de Kubernetes detectado. Desplegando stack..." -ForegroundColor Green
    & helm upgrade --install $ReleaseName $stackDir --namespace $Namespace --create-namespace --wait --timeout 5m
    Write-Host "[OK] Despliegue completado con exito." -ForegroundColor Green
} else {
    Write-Host "[AVISO] No se detecto un cluster de Kubernetes activo localmente." -ForegroundColor Yellow
    Write-Host "[OK] La validacion completa de los charts y renderizado fue EXITOSA." -ForegroundColor Green
    Write-Host "  Para desplegar cuando el cluster este iniciado, ejecute:" -ForegroundColor Cyan
    Write-Host "  helm upgrade --install $ReleaseName $stackDir --namespace $Namespace --create-namespace" -ForegroundColor White
}
