#!/usr/bin/env bash
# Desinstala el stack completo de Helm
set -euo pipefail
RELEASE_NAME="${RELEASE_NAME:-proxycache}"
NAMESPACE="${NAMESPACE:-proxycache}"

echo "🗑️ Desinstalando release '${RELEASE_NAME}' del namespace '${NAMESPACE}'..."
helm uninstall "${RELEASE_NAME}" --namespace "${NAMESPACE}" || true
echo "✔ Stack desinstalado."
