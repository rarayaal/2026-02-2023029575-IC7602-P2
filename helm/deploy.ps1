# ==============================================================================
# Script de Despliegue Conjunto de Helm Charts en Windows (T-40)
# ==============================================================================

param (
    [string]$ReleaseName = "proxycache",
    [string]$Namespace = "proxycache",
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$stackDir = Join-Path $scriptDir "proxycache-stack"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  IC-7602 - Orquestacion Global Helm en Windows (T-40)" -ForegroundColor Cyan
Write-Host "  Release:   $ReleaseName" -ForegroundColor Cyan
Write-Host "  Namespace: $Namespace" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Comprobar Helm
try {
    $helmVer = & helm version --short 2>$null
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($helmVer)) {
        throw "Helm no retorno una version valida."
    }
    Write-Host "[OK] Helm detectado: $helmVer" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Helm no esta disponible en el PATH o fallo al ejecutarse." -ForegroundColor Red
    exit 1
}

# 2. Actualizar dependencias
Write-Host "[INFO] Actualizando dependencias del Umbrella Chart..." -ForegroundColor Yellow
& helm dependency update $stackDir
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Fallo al actualizar dependencias de Helm." -ForegroundColor Red
    exit 1
}

# 3. Linting de los charts
Write-Host "[INFO] Ejecutando helm lint en todos los charts..." -ForegroundColor Yellow
$p1 = Join-Path $scriptDir "dns-interceptor"
$p2 = Join-Path $scriptDir "zonal-cache"
$p3 = Join-Path $scriptDir "node-api"
$p4 = Join-Path $scriptDir "ui"
$p5 = Join-Path $scriptDir "mock-origin"

$p6 = Join-Path $scriptDir "apache-server"
$p7 = Join-Path $scriptDir "rest-api-java"
function Invoke-Lint {
    param(
        [string]$ChartPath
    )
    & helm lint $ChartPath
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Error durante la verificacion de helm lint en: $ChartPath" -ForegroundColor Red
        exit 1
    }
}

Invoke-Lint $p1
Invoke-Lint $p4
Invoke-Lint $p5
Invoke-Lint $p6
Invoke-Lint $p7
Invoke-Lint $p2
Invoke-Lint $p3
Invoke-Lint $stackDir

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

# 5. Comprobar variables reales de entorno antes de desplegar
Write-Host "[INFO] Verificando variables de entorno obligatorias para despliegue..." -ForegroundColor Yellow
$missingVars = @()
if ([string]::IsNullOrWhiteSpace($env:INTERNAL_SERVICE_TOKEN)) { $missingVars += "INTERNAL_SERVICE_TOKEN" }
if ([string]::IsNullOrWhiteSpace($env:FIREBASE_PROJECT_ID)) { $missingVars += "FIREBASE_PROJECT_ID" }
if ([string]::IsNullOrWhiteSpace($env:FIREBASE_CLIENT_EMAIL)) { $missingVars += "FIREBASE_CLIENT_EMAIL" }
if ([string]::IsNullOrWhiteSpace($env:FIREBASE_PRIVATE_KEY)) { $missingVars += "FIREBASE_PRIVATE_KEY" }

if ($missingVars.Count -gt 0) {
    Write-Host "[ERROR] Faltan las siguientes variables de entorno obligatorias para el despliegue:" -ForegroundColor Red
    foreach ($v in $missingVars) {
        Write-Host "   - $v" -ForegroundColor Red
    }
    Write-Host "Configure estas variables en su entorno PowerShell antes de ejecutar el despliegue." -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] Variables de entorno detectadas correctamente." -ForegroundColor Green

# 6. Comprobar cluster
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

    $tempKeyFile = [System.IO.Path]::GetTempFileName()
    try {
        $keyContent = $env:FIREBASE_PRIVATE_KEY
        if ($keyContent.StartsWith('"') -and $keyContent.EndsWith('"') -and $keyContent.Length -ge 2) {
            $keyContent = $keyContent.Substring(1, $keyContent.Length - 2)
        }
        if ($keyContent.Contains('\n')) {
            $keyContent = $keyContent.Replace('\r\n', "`n").Replace('\n', "`n")
        }
        if (-not $keyContent.EndsWith("`n")) {
            $keyContent += "`n"
        }

        $utf8NoBom = New-Object System.Text.UTF8Encoding $false
        [System.IO.File]::WriteAllText($tempKeyFile, $keyContent, $utf8NoBom)
        $tempHelmPath = $tempKeyFile.Replace('\', '/')

        # Asegurar el namespace para los secretos
        & kubectl create namespace $Namespace --dry-run=client -o yaml | & kubectl apply -f -

        # Crear certificado TLS autofirmado para el Ingress de zonal-cache si no existe
        $secretExists = & kubectl get secret zonal-cache-tls -n $Namespace --ignore-not-found 2>$null

        if ([string]::IsNullOrWhiteSpace($secretExists)) {
            Write-Host "[INFO] Generando certificado autofirmado para zonal-cache-tls..." -ForegroundColor Yellow

            $tempCertDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
            $null = New-Item -ItemType Directory -Path $tempCertDir -Force

            $keyPath = Join-Path $tempCertDir "tls.key"
            $crtPath = Join-Path $tempCertDir "tls.crt"

            try {
                $env:MSYS2_ARG_CONV_EXCL = "/CN="

                & openssl req -x509 -nodes -days 365 -newkey rsa:2048 `
                    -keyout $keyPath `
                    -out $crtPath `
                    -subj "/CN=cache.local" 2>$null

                & kubectl create secret tls zonal-cache-tls `
                    --cert=$crtPath `
                    --key=$keyPath `
                    -n $Namespace

                Write-Host "[OK] Secreto zonal-cache-tls creado exitosamente en namespace '$Namespace'." -ForegroundColor Green
            }
            finally {
                Remove-Item -Recurse -Force $tempCertDir -ErrorAction SilentlyContinue
            }
        }
        else {
            Write-Host "[OK] Secreto zonal-cache-tls ya existe en namespace '$Namespace'." -ForegroundColor Green
        }

        Write-Host "[INFO] Paso 1/2: Desplegando stack base (zonal-cache, node-api, ui, mock-origin, dns-interceptor)..." -ForegroundColor Yellow
        & helm upgrade --install $ReleaseName $stackDir --namespace $Namespace --create-namespace --wait --atomic --timeout 5m `
            --set global.internalServiceToken=$env:INTERNAL_SERVICE_TOKEN `
            --set zonal-cache.env.CONFIG_API_TOKEN=$env:INTERNAL_SERVICE_TOKEN `
            --set node-api.env.INTERNAL_SERVICE_TOKEN=$env:INTERNAL_SERVICE_TOKEN `
            --set node-api.env.FIREBASE_PROJECT_ID=$env:FIREBASE_PROJECT_ID `
            --set node-api.env.FIREBASE_CLIENT_EMAIL=$env:FIREBASE_CLIENT_EMAIL `
            --set-file node-api.env.FIREBASE_PRIVATE_KEY=$tempHelmPath

        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Fallo el despliegue del stack base (codigo de salida $LASTEXITCODE)." -ForegroundColor Red
            exit $LASTEXITCODE
        }

        Write-Host "[INFO] Paso 2/2: Obteniendo ClusterIP del servicio de la cache ($ReleaseName)..." -ForegroundColor Yellow
        $cacheIp = & kubectl get svc $ReleaseName -n $Namespace -o jsonpath='{.spec.clusterIP}' 2>$null
        if (-not [string]::IsNullOrWhiteSpace($cacheIp) -and $cacheIp -ne "None") {
            Write-Host "[OK] ClusterIP detectado: $cacheIp. Aplicando actualizacion de dns-interceptor..." -ForegroundColor Green
            & helm upgrade --install $ReleaseName $stackDir --namespace $Namespace --wait --atomic --timeout 5m `
                --set global.internalServiceToken=$env:INTERNAL_SERVICE_TOKEN `
                --set zonal-cache.env.CONFIG_API_TOKEN=$env:INTERNAL_SERVICE_TOKEN `
                --set node-api.env.INTERNAL_SERVICE_TOKEN=$env:INTERNAL_SERVICE_TOKEN `
                --set node-api.env.FIREBASE_PROJECT_ID=$env:FIREBASE_PROJECT_ID `
                --set node-api.env.FIREBASE_CLIENT_EMAIL=$env:FIREBASE_CLIENT_EMAIL `
                --set-file node-api.env.FIREBASE_PRIVATE_KEY=$tempHelmPath `
                --set dns-interceptor.env.zonalCacheCr=$cacheIp `
                --set dns-interceptor.env.zonalCacheUs=$cacheIp `
                --set dns-interceptor.env.zonalCacheDefault=$cacheIp
            if ($LASTEXITCODE -ne 0) {
                Write-Host "[ERROR] Fallo la actualizacion de dns-interceptor con ClusterIP." -ForegroundColor Red
                exit $LASTEXITCODE
            }
            Write-Host "[OK] dns-interceptor configurado con ClusterIP: $cacheIp" -ForegroundColor Green
        } else {
            Write-Host "[AVISO] No se pudo obtener el ClusterIP de la cache automaticamente. Manteniendo IPs predeterminadas." -ForegroundColor Yellow
        }

        Write-Host "[OK] Despliegue completado con exito en el namespace '$Namespace'." -ForegroundColor Green
        Write-Host "  Comandos utiles:" -ForegroundColor Cyan
        Write-Host "  kubectl get pods -n $Namespace" -ForegroundColor White
        Write-Host "  kubectl get svc -n $Namespace" -ForegroundColor White
        Write-Host "  kubectl get ingress -n $Namespace" -ForegroundColor White
    }
    finally {
        if ($tempKeyFile -and (Test-Path $tempKeyFile)) {
            Remove-Item -Force $tempKeyFile
        }
    }
} else {
    Write-Host "[AVISO] No se detecto un cluster de Kubernetes activo localmente." -ForegroundColor Yellow
    Write-Host "[OK] La validacion completa de los charts y renderizado fue EXITOSA." -ForegroundColor Green
    Write-Host "  Para desplegar cuando el cluster este iniciado, ejecute:" -ForegroundColor Cyan
    Write-Host "  helm upgrade --install $ReleaseName $stackDir --namespace $Namespace --create-namespace --wait --atomic --set global.internalServiceToken=`$env:INTERNAL_SERVICE_TOKEN --set zonal-cache.env.CONFIG_API_TOKEN=`$env:INTERNAL_SERVICE_TOKEN --set node-api.env.INTERNAL_SERVICE_TOKEN=`$env:INTERNAL_SERVICE_TOKEN --set node-api.env.FIREBASE_PROJECT_ID=`$env:FIREBASE_PROJECT_ID --set node-api.env.FIREBASE_CLIENT_EMAIL=`$env:FIREBASE_CLIENT_EMAIL --set-file node-api.env.FIREBASE_PRIVATE_KEY=path/to/firebase-private-key.pem" -ForegroundColor White
}
