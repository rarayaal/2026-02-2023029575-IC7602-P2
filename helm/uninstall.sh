#!/usr/bin/env bash
# ==============================================================================
# Script de Desinstalación del Stack Helm (T-40)
# ==============================================================================
set -euo pipefail

RELEASE_NAME="${RELEASE_NAME:-proxycache}"
NAMESPACE="${NAMESPACE:-proxycache}"
DELETE_NAMESPACE="${DELETE_NAMESPACE:-false}"
DELETE_PVC="${DELETE_PVC:-false}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --delete-pvc)
      DELETE_PVC="true"
      shift
      ;;
    --delete-namespace)
      DELETE_NAMESPACE="true"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

echo "🗑️ Desinstalando release '${RELEASE_NAME}' del namespace '${NAMESPACE}'..."
if helm status "${RELEASE_NAME}" --namespace "${NAMESPACE}" &>/dev/null; then
  helm uninstall "${RELEASE_NAME}" --namespace "${NAMESPACE}"
  echo "✔ Release '${RELEASE_NAME}' desinstalada correctamente."
else
  echo "ℹ Release '${RELEASE_NAME}' no encontrada o ya desinstalada."
fi

# Gestión de recursos persistentes (PVCs) y namespace
if command -v kubectl &>/dev/null; then
  if [ "${DELETE_PVC}" = "true" ]; then
    echo "⚠️ Opción --delete-pvc detectada. Eliminando PersistentVolumeClaims asociados a '${RELEASE_NAME}'..."
    kubectl delete pvc -l "app.kubernetes.io/instance=${RELEASE_NAME}" -n "${NAMESPACE}" --ignore-not-found=true 2>/dev/null || true
    kubectl delete pvc -l "app=${RELEASE_NAME}" -n "${NAMESPACE}" --ignore-not-found=true 2>/dev/null || true
    kubectl delete pvc "${RELEASE_NAME}-cache" -n "${NAMESPACE}" --ignore-not-found=true 2>/dev/null || true
    echo "✔ PersistentVolumeClaims eliminados."
  else
    echo "ℹ Los PersistentVolumeClaims (PVCs) se han conservado por defecto para proteger los datos persistentes."
    echo "  (Para eliminarlos explícitamente, ejecute el script con la opción --delete-pvc)"
  fi

  if [ "${DELETE_NAMESPACE}" = "true" ]; then
    echo "🗑️ Opción --delete-namespace detectada. Eliminando namespace '${NAMESPACE}'..."
    kubectl delete namespace "${NAMESPACE}" --ignore-not-found=true
    echo "✔ Namespace '${NAMESPACE}' eliminado."
  fi
fi

echo "✔ Desinstalación completada."
