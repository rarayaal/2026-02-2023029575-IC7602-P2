#!/usr/bin/env bash

echo "========================================================"
echo "       Script Git - Commit y Push (Alexandra)          "
echo "========================================================"

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

if [ -z "$CURRENT_BRANCH" ]; then
    echo "[ERROR] No se detectó un repositorio Git válido."
    exit 1
fi

echo "Rama actual: [$CURRENT_BRANCH]"
echo ""
echo "Archivos modificados:"
git status -s
echo ""

if [ -n "$1" ]; then
    COMMIT_MSG="$*"
else
    read -p "Ingresa el mensaje para el commit: " COMMIT_MSG
fi

if [ -z "$COMMIT_MSG" ]; then
    echo "[AVISO] Mensaje vacío. Cancelando..."
    exit 1
fi

echo "1. Agregando archivos (git add .)..."
git add .

echo "2. Creando commit: \"$COMMIT_MSG\"..."
git commit -m "$COMMIT_MSG"

if [ $? -ne 0 ]; then
    echo "[AVISO] No hay cambios para commitear."
    exit 0
fi

echo "3. Enviando cambios (git push origin $CURRENT_BRANCH)..."
git push origin "$CURRENT_BRANCH"

if [ $? -eq 0 ]; then
    echo "[OK] Commit y push realizados con éxito en $CURRENT_BRANCH!"
else
    echo "[ERROR] Falló el push. Revisa tu conexión o ejecuta 'git pull origin $CURRENT_BRANCH'."
fi
