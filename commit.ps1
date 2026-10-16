param(
    [Parameter(Position=0)]
    [string]$Message
)

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "       Script Git - Commit y Push (Alexandra)          " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

$currentBranch = (git rev-parse --abbrev-ref HEAD 2>$null).Trim()

if (-not $currentBranch) {
    Write-Host "[ERROR] No se detectó un repositorio Git válido aquí." -ForegroundColor Red
    exit 1
}

Write-Host "Rama actual: " -NoNewline
Write-Host "[$currentBranch]" -ForegroundColor Green
Write-Host ""

Write-Host "Archivos con cambios:" -ForegroundColor Yellow
git status -s
Write-Host ""

if (-not $Message) {
    $Message = Read-Host "Ingresa el mensaje para el commit"
}

if ([string]::IsNullOrWhiteSpace($Message)) {
    Write-Host "[AVISO] El mensaje no puede estar vacío. Operación cancelada." -ForegroundColor Red
    exit 1
}

Write-Host "1. Agregando archivos (git add .)..." -ForegroundColor Gray
git add .

Write-Host "2. Creando commit: `"$Message`"..." -ForegroundColor Gray
git commit -m $Message

if ($LASTEXITCODE -ne 0) {
    Write-Host "[AVISO] No hay cambios pendientes para commit." -ForegroundColor Yellow
    exit 0
}

Write-Host "3. Enviando a origin $currentBranch..." -ForegroundColor Gray
git push origin $currentBranch

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n[OK] Commit y push realizados con éxito en $currentBranch!" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] Falló el push a origin $currentBranch. Verifica tu conexión o haz git pull." -ForegroundColor Red
}
