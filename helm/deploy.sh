#!/usr/bin/env bash
# ==============================================================================
# Script de Despliegue Conjunto de Helm Charts (T-40)
# Proyecto: Proxy/Caché de Aplicación con Geolocalización (IC-7602)
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STACK_DIR="${SCRIPT_DIR}/proxycache-stack"
RELEASE_NAME="${RELEASE_NAME:-proxycache}"
NAMESPACE="${NAMESPACE:-proxycache}"
DRY_RUN="${DRY_RUN:-false}"

echo "=========================================================="
echo "  IC-7602 - Orquestación Global Helm (T-40)"
echo "  Release:   ${RELEASE_NAME}"
echo "  Namespace: ${NAMESPACE}"
echo "=========================================================="

# 1. Verificar disponibilidad de Helm
if ! command -v helm &> /dev/null; then
    echo "❌ Error: Helm no está instalado en el PATH."
    exit 1
fi
echo "✔ Helm detectado: $(helm version --short)"

# 2. Actualizar dependencias del Umbrella Chart
echo "📦 Actualizando dependencias de subcharts..."
helm dependency update "${STACK_DIR}"

# 3. Validar sintaxis y buenas prácticas con helm lint
echo "🔍 Ejecutando helm lint en todos los charts..."
helm lint "${SCRIPT_DIR}/dns-interceptor"
helm lint "${SCRIPT_DIR}/zonal-cache"
helm lint "${SCRIPT_DIR}/node-api"
helm lint "${SCRIPT_DIR}/ui"
helm lint "${STACK_DIR}"
echo "✔ Todos los charts pasaron la verificación de helm lint exitosamente."

# 4. Renderizar y validar manifiestos en seco
echo "📄 Validando renderizado de manifiestos con helm template..."
helm template "${RELEASE_NAME}" "${STACK_DIR}" > /dev/null
echo "✔ Manifiestos de Kubernetes renderizados sin errores de sintaxis."

# 5. Comprobar conectividad con clúster de Kubernetes
if [ "${DRY_RUN}" = "true" ]; then
    echo "ℹ Modo DRY_RUN activado: Simulación de instalación completada con éxito."
    exit 0
fi

if command -v kubectl &> /dev/null && kubectl cluster-info &> /dev/null; then
    echo "🌐 Clúster de Kubernetes detectado. Procediendo con la instalación/actualización..."
    helm upgrade --install "${RELEASE_NAME}" "${STACK_DIR}" \
        --namespace "${NAMESPACE}" \
        --create-namespace \
        --wait \
        --timeout 5m

    echo "=========================================================="
    echo "✔ Despliegue completado exitosamente en el namespace '${NAMESPACE}'."
    echo "  Comandos útiles:"
    echo "  kubectl get pods -n ${NAMESPACE}"
    echo "  kubectl get svc -n ${NAMESPACE}"
    echo "  kubectl get ingress -n ${NAMESPACE}"
    echo "=========================================================="
else
    echo "⚠️ Aviso: No se detectó un clúster de Kubernetes activo localmente."
    echo "✔ La validación completa de los charts, dependencias y renderizado fue EXITOSA."
    echo "  Para desplegar cuando el clúster esté iniciado, ejecute:"
    echo "  helm upgrade --install ${RELEASE_NAME} ${STACK_DIR} --namespace ${NAMESPACE} --create-namespace"
fi
