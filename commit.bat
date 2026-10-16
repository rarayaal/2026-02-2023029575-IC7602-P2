@echo off
chcp 65001 >nul
echo ========================================================
echo        Script de Automatización Git - Alexandra
echo ========================================================

:: Obtener la rama actual
for /f "tokens=*" %%a in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set CURRENT_BRANCH=%%a

if "%CURRENT_BRANCH%"=="" (
    echo [ERROR] No se detecto un repositorio Git valido.
    pause
    exit /b 1
)

echo Rama actual: [%CURRENT_BRANCH%]
echo.

:: Mostrar el estado actual
echo Archivos modificados:
git status -s
echo.

:: Obtener el mensaje de commit
set COMMIT_MSG=%*
if "%COMMIT_MSG%"=="" (
    set /p COMMIT_MSG="Ingresa el mensaje para el commit: "
)

if "%COMMIT_MSG%"=="" (
    echo [AVISO] El mensaje de commit no puede estar vacio. Operacion cancelada.
    pause
    exit /b 1
)

echo.
echo 1. Anadiendo archivos modificados (git add .)...
git add .

echo 2. Creando commit: "%COMMIT_MSG%"...
git commit -m "%COMMIT_MSG%"
if errorlevel 1 (
    echo [AVISO] No habia cambios pendientes para realizar commit.
    pause
    exit /b 0
)

echo 3. Enviando cambios al repositorio remoto (git push origin %CURRENT_BRANCH%)...
git push origin %CURRENT_BRANCH%

if errorlevel 1 (
    echo.
    echo [ERROR] Hubo un problema al hacer push. Revisa tu conexion o si debes hacer pull primero.
) else (
    echo.
    echo [OK] Commit y push completados exitosamente en la rama %CURRENT_BRANCH%!
)

echo.
pause
