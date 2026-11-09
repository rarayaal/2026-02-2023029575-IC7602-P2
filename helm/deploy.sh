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
helm lint "${SCRIPT_DIR}/ui"
helm lint "${SCRIPT_DIR}/mock-origin"
helm lint "${SCRIPT_DIR}/apache-server"
helm lint "${SCRIPT_DIR}/rest-api-java"
helm lint "${SCRIPT_DIR}/zonal-cache"
helm lint "${SCRIPT_DIR}/node-api"
helm lint "${STACK_DIR}"
echo "✔ Todos los charts pasaron la verificación de helm lint exitosamente."

# 4. Renderizar y validar manifiestos en seco
echo "📄 Validando renderizado de manifiestos con helm template..."
helm template "${RELEASE_NAME}" "${STACK_DIR}" > /dev/null
echo "✔ Manifiestos de Kubernetes renderizados sin errores de sintaxis."

# 5. Comprobar modo simulación (DRY_RUN)
if [ "${DRY_RUN}" = "true" ]; then
    echo "ℹ Modo DRY_RUN activado: Simulación y validación de sintaxis completada con éxito."
    exit 0
fi

# 6. Validar presencia de secretos reales en el entorno para despliegue
echo "🔐 Verificando variables de entorno obligatorias para despliegue..."
MISSING_VARS=()
[ -z "${INTERNAL_SERVICE_TOKEN:-}" ] && MISSING_VARS+=("INTERNAL_SERVICE_TOKEN")
[ -z "${FIREBASE_PROJECT_ID:-}" ] && MISSING_VARS+=("FIREBASE_PROJECT_ID")
[ -z "${FIREBASE_CLIENT_EMAIL:-}" ] && MISSING_VARS+=("FIREBASE_CLIENT_EMAIL")
[ -z "${FIREBASE_PRIVATE_KEY:-}" ] && MISSING_VARS+=("FIREBASE_PRIVATE_KEY")

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Error: Faltan las siguientes variables de entorno requeridas para el despliegue:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - ${var}"
    done
    echo "Exporte las variables en su shell o cárguelas desde su archivo .env antes de desplegar."
    exit 1
fi
echo "✔ Variables de entorno detectadas correctamente."

# 7. Comprobar conectividad con clúster de Kubernetes y ejecutar despliegue
if command -v kubectl &> /dev/null && kubectl cluster-info &> /dev/null; then
    echo "🌐 Clúster de Kubernetes detectado. Procediendo con la instalación/actualización..."

    # Crear archivo temporal con permisos restringidos (chmod 600) para la llave
    TEMP_KEY_FILE="$(mktemp "${TMPDIR:-/tmp}/firebase-key.XXXXXX")"
    chmod 600 "${TEMP_KEY_FILE}"
    trap 'rm -f "${TEMP_KEY_FILE:-}"' EXIT INT TERM

    # Si contiene secuencias '\n' literales, convertirlas en saltos de línea reales
    KEY_CONTENT="${FIREBASE_PRIVATE_KEY}"
    # Retirar comillas externas envolventes si vinieron incluidas literalmente
    [[ "${KEY_CONTENT}" =~ ^\"(.*)\"$ ]] && KEY_CONTENT="${BASH_REMATCH[1]}"
    if [[ "${KEY_CONTENT}" == *'\n'* ]]; then
        KEY_CONTENT="$(printf '%b' "${KEY_CONTENT}")"
    fi
    printf '%s\n' "${KEY_CONTENT}" > "${TEMP_KEY_FILE}"

    HELM_KEY_PATH="${TEMP_KEY_FILE}"
    if command -v cygpath &> /dev/null; then
        HELM_KEY_PATH="$(cygpath -m "${TEMP_KEY_FILE}")"
    fi

    # Asegurar el namespace para los secretos
    kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml | kubectl apply -f -

    # Crear certificado TLS autofirmado para el Ingress de zonal-cache si no existe
    if ! kubectl get secret zonal-cache-tls -n "${NAMESPACE}" &> /dev/null; then
        echo "🔐 Generando certificado autofirmado para zonal-cache-tls..."

        TLS_DIR="$(mktemp -d "${TMPDIR:-/tmp}/tls-cert.XXXXXX")"

        # MSYS2_ARG_CONV_EXCL previene que Git Bash convierta /CN= en ruta de Windows
        MSYS2_ARG_CONV_EXCL="/CN=" openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "${TLS_DIR}/tls.key" \
            -out "${TLS_DIR}/tls.crt" \
            -subj "/CN=cache.local" \
            -addext "subjectAltName=DNS:cache.local" 2>/dev/null

        kubectl create secret tls zonal-cache-tls \
            --cert="${TLS_DIR}/tls.crt" \
            --key="${TLS_DIR}/tls.key" \
            -n "${NAMESPACE}"

        rm -rf "${TLS_DIR}"

        echo "✔ Secreto zonal-cache-tls creado exitosamente en namespace ${NAMESPACE}."
    else
        echo "✔ Secreto zonal-cache-tls ya existe en namespace ${NAMESPACE}."
    fi

    echo "📦 Paso 1/2: Desplegando stack base (zonal-cache, node-api, ui, mock-origin, dns-interceptor)..."
    helm upgrade --install "${RELEASE_NAME}" "${STACK_DIR}" \
        --namespace "${NAMESPACE}" \
        --create-namespace \
        --wait \
        --atomic \
        --timeout 5m \
        --set global.internalServiceToken="${INTERNAL_SERVICE_TOKEN}" \
        --set zonal-cache.env.CONFIG_API_TOKEN="${INTERNAL_SERVICE_TOKEN}" \
        --set dns-interceptor.env.configApiToken="${INTERNAL_SERVICE_TOKEN}" \
        --set node-api.env.INTERNAL_SERVICE_TOKEN="${INTERNAL_SERVICE_TOKEN}" \
        --set node-api.env.FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID}" \
        --set node-api.env.FIREBASE_CLIENT_EMAIL="${FIREBASE_CLIENT_EMAIL}" \
        --set-file node-api.env.FIREBASE_PRIVATE_KEY="${HELM_KEY_PATH}"

    echo "🔍 Paso 2/2: Obteniendo ClusterIP del servicio de la caché (${RELEASE_NAME})..."
    CACHE_IP="$(kubectl get svc "${RELEASE_NAME}" -n "${NAMESPACE}" -o jsonpath='{.spec.clusterIP}' 2>/dev/null || true)"
    if [ -n "${CACHE_IP}" ] && [ "${CACHE_IP}" != "None" ]; then
        echo "✔ ClusterIP detectado: ${CACHE_IP}. Aplicando actualización de dns-interceptor..."
        helm upgrade --install "${RELEASE_NAME}" "${STACK_DIR}" \
            --namespace "${NAMESPACE}" \
            --wait \
            --atomic \
            --timeout 5m \
            --set global.internalServiceToken="${INTERNAL_SERVICE_TOKEN}" \
            --set zonal-cache.env.CONFIG_API_TOKEN="${INTERNAL_SERVICE_TOKEN}" \
            --set dns-interceptor.env.configApiToken="${INTERNAL_SERVICE_TOKEN}" \
            --set node-api.env.INTERNAL_SERVICE_TOKEN="${INTERNAL_SERVICE_TOKEN}" \
            --set node-api.env.FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID}" \
            --set node-api.env.FIREBASE_CLIENT_EMAIL="${FIREBASE_CLIENT_EMAIL}" \
            --set-file node-api.env.FIREBASE_PRIVATE_KEY="${HELM_KEY_PATH}" \
            --set dns-interceptor.env.zonalCacheCr="${CACHE_IP}" \
            --set dns-interceptor.env.zonalCacheUs="${CACHE_IP}" \
            --set dns-interceptor.env.zonalCacheDefault="${CACHE_IP}"
        echo "✔ dns-interceptor configurado con ClusterIP: ${CACHE_IP}"
    else
        echo "⚠️ No se pudo obtener el ClusterIP de la caché automáticamente. Manteniendo IPs predeterminadas."
    fi

    rm -f "${TEMP_KEY_FILE}"
    trap - EXIT INT TERM

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
    echo "  helm upgrade --install ${RELEASE_NAME} ${STACK_DIR} --namespace ${NAMESPACE} --create-namespace \\"
    echo "    --set global.internalServiceToken=\$INTERNAL_SERVICE_TOKEN \\"
    echo "    --set zonal-cache.env.CONFIG_API_TOKEN=\$INTERNAL_SERVICE_TOKEN \\"
    echo "    --set node-api.env.INTERNAL_SERVICE_TOKEN=\$INTERNAL_SERVICE_TOKEN \\"
    echo "    --set node-api.env.FIREBASE_PROJECT_ID=\$FIREBASE_PROJECT_ID \\"
    echo "    --set node-api.env.FIREBASE_CLIENT_EMAIL=\$FIREBASE_CLIENT_EMAIL \\"
    echo "    --set-file node-api.env.FIREBASE_PRIVATE_KEY=/ruta/hacia/firebase-private-key.pem"
fi
