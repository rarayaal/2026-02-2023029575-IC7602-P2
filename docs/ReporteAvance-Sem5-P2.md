# Reporte Semanal de Avance – Proyecto 2

**Curso:** IC7602

**PROYECTO:** 2

**Semana:** 5

**Fecha del reporte:** 05/11/2026


## 1. Integrantes del grupo

| Carné      | Nombre completo          |
| ---------- | ------------------------ |
| 2022104884 | Isaac Rojas Robles       |
| 2023029575 | Rafael Araya             |
| 2020426226 | Otto Segura              |
| 2020030408 | Luis Diego Delgado Muñoz |
| 2026801601 | Alexandra De Gracia      |

---

## 2. Estado de las tareas

### Zonal Cache: motor de caché y políticas de reemplazo · Isaac Rojas Robles

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-01 | Interfaz pública del motor de caché  | Definir `cache.h` con los tipos y firmas que forman el contrato con el servidor HTTP | Isaac Rojas | Finalizada | 100% | Ninguno |
| T-02 | Almacenamiento en disco              | Estructura de directorios y lectura/escritura de objetos cacheados          | Isaac Rojas    | En progreso | 95% | Colisión de nombres de archivo sin resolver (P-01) |
| T-03 | Índice de entradas en memoria        | Clave dominio más URL, tamaño, TTL y contadores de acceso                   | Isaac Rojas    | Finalizada  | 100% | Ninguno (P-02 resuelto) |
| T-04 | Expiración por TTL                   | Invalidar entradas vencidas según el TTL por tipo de archivo                | Isaac Rojas    | Finalizada  | 100% | Ninguno |
| T-05 | Límite de tamaño por dominio         | Cumplir el tamaño máximo de caché por dominio                              | Isaac Rojas    | Finalizada  | 100% | Ninguno |
| T-06 | Políticas LRU y MRU                  | Algoritmos de reemplazo Least y Most Recently Used                          | Isaac Rojas    | Finalizada  | 100% | Ninguno |
| T-07 | Políticas LFU, FIFO y Random         | Algoritmos de reemplazo Least Frequently Used, First-In First-Out y Random  | Isaac Rojas    | Finalizada  | 100% | Ninguno |
| T-08 | Pruebas unitarias del motor          | Validar cada política y el control de tamaño de forma aislada               | Isaac Rojas    | Finalizada  | 100% | Ninguno |

### Zonal Cache: servidor HTTP, seguridad y origen · Rafael Araya

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-09 | Servidor HTTP concurrente            | Servidor en GNU C que atiende múltiples peticiones simultáneas              | Rafael Araya   | Finalizada  | 100% | Ninguno; se agregó una prueba de concurrencia |
| T-10 | Parseo de peticiones y matching      | Interpretar la petición y asociar la URL con su configuración y wildcards   | Rafael Araya   | Finalizada  | 100% | Ninguno |
| T-11 | Lectura de la configuración          | Obtener la configuración del dominio a través del REST API en Node.js       | Rafael Araya   | En progreso | 90% | Implementado; falta la prueba de extremo a extremo (T-44) |
| T-12 | Obtención del recurso desde el origen| Solicitar al origen el recurso ausente, almacenarlo y servirlo              | Rafael Araya   | En progreso | 90% | Implementado para HTTP y HTTPS; falta la prueba con los cuatro orígenes (T-44) |
| T-13 | Autenticación por `x-api-key`        | Validar peticiones mediante el encabezado de API key                        | Rafael Araya   | En progreso | 90% | El respaldo acepta cualquier key en algunos casos (P-13) |
| T-14 | Autenticación por usuario y contraseña | Redirigir al formulario de la UI y procesar el resultado                  | Rafael Araya   | En progreso | 90% | Implementado; falta probarlo con el formulario de la UI (T-44) |
| T-15 | Verificación de sesión               | Comprobar la sesión en las peticiones posteriores                           | Rafael Araya   | En progreso | 90% | El respaldo acepta cualquier sesión en algunos casos (P-13) |
| T-16 | SSL termination y automatización     | Terminación SSL, Dockerfile y Helm Chart del Zonal Cache                    | Rafael Araya   | En progreso | 80% | El secreto TLS del Ingress no se crea automáticamente (P-14) |

### DNS Interceptor, Rest API en Java y Apache Server · Otto Segura

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-17 | Adaptación del DNS Interceptor       | Adaptar el componente del Proyecto 1 al flujo de cachés zonales             | Otto Segura    | Finalizada  | 100% | Ninguno |
| T-18 | Interceptación de dominios           | Interceptar solo los dominios registrados                                   | Otto Segura    | En progreso | 90% | Los dominios se cargan por variable de entorno (P-05) |
| T-19 | Selección de caché zonal por país    | Determinar el país con la base IP to Country y elegir la caché              | Otto Segura    | En progreso | 70% | No usa la base IP to Country del Proyecto 1 (P-15) |
| T-20 | Construcción de la respuesta DNS     | Responder apuntando a la caché zonal seleccionada                           | Otto Segura    | Finalizada  | 100% | Ninguno |
| T-21 | Automatización del DNS Interceptor   | Dockerfile y Helm Chart del componente                                      | Otto Segura    | Finalizada  | 100% | Ninguno |
| T-22 | Rest API en Java                     | API con endpoints GET, POST, PUT y DELETE                                   | Otto Segura    | Finalizada  | 100% | Ninguno |
| T-23 | Automatización del Rest API en Java  | Dockerfile y Helm Chart del componente                                      | Otto Segura    | Finalizada  | 100% | Ninguno |
| T-24 | Apache Server                        | Servidor con una página HTML básica y su Helm Chart                         | Otto Segura    | Finalizada  | 100% | Ninguno |

### REST API en Node.js y modelo de datos · Luis Diego Delgado Muñoz

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-25 | Modelo de datos en Firestore         | Colecciones de usuarios, dominios, URLs, caché, API keys y sesiones         | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-26 | Estructura base del API              | Proyecto Node.js y despliegue automático en Vercel                          | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-27 | Endpoints de usuarios                | Registro, autenticación y administración de cuentas                         | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-28 | Endpoints de dominios                | Alta, baja y verificación de propiedad mediante registro TXT                | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-29 | Endpoints de URLs y caché            | URLs con wildcards y configuración por tipo de archivo, TTL y política      | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-30 | Endpoints de API keys y sesiones     | Creación y eliminación de keys; emisión y validación de sesiones            | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-31 | Endpoints para las cachés zonales    | Configuración del dominio y validación de credenciales y sesiones           | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-32 | Mecanismo de seguridad del API       | Investigar, implementar y documentar la autenticación y autorización        | Luis Delgado   | Finalizada  | 100% | Ninguno; documentado en `docs/seguridad-api.md` |

### UI y orquestación global · Alexandra De Gracia

| ID   | Tarea                                | Descripción                                                                 | Responsable(s)      | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | ------------------- | ----------- | -----: | --------- |
| T-33 | Estructura base de la UI             | React, Vite y Tailwind CSS con despliegue automático en Vercel              | Alexandra De Gracia | Finalizada  | 100% | Ninguno |
| T-34 | Registro de cuenta y dominio         | Crear cuenta y registrar dominio validado con registro TXT                  | Alexandra De Gracia | En progreso | 90% | Falta la prueba de extremo a extremo (T-44) |
| T-35 | Administración de dominios           | Agregar y eliminar dominios verificando la propiedad                        | Alexandra De Gracia | En progreso | 90% | Falta la prueba de extremo a extremo (T-44) |
| T-36 | Administración de URLs               | Crear, eliminar y modificar URLs con wildcards                              | Alexandra De Gracia | En progreso | 90% | Falta la prueba de extremo a extremo (T-44) |
| T-37 | Configuración de caché por URL       | Tamaño de caché, y por tipo de archivo el TTL y la política                 | Alexandra De Gracia | En progreso | 90% | Falta la prueba de extremo a extremo (T-44) |
| T-38 | Configuración de autenticación       | API keys y usuarios con contraseña por URL                                  | Alexandra De Gracia | En progreso | 90% | Falta la prueba de extremo a extremo (T-44) |
| T-39 | Formulario de autenticación y sesión | Formulario usado por las cachés zonales y cierre de sesión                  | Alexandra De Gracia | En progreso | 90% | Falta probarlo con el Zonal Cache (T-44) |
| T-40 | Orquestación global del stack        | Docker Compose y despliegue conjunto de los Helm Charts                     | Alexandra De Gracia | En progreso | 90% | Los charts pasan `helm lint`, `helm template` y la prueba en modo simulación; falta instalarlos en un clúster real |

### Tareas transversales · Todo el grupo

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-41 | Documentación técnica por componente | Instrucciones, diagramas y casos de prueba de cada componente               | Los 5          | En progreso | 60% | Documentados el Zonal Cache, el REST API, la UI y la orquestación; faltan el DNS Interceptor, el Apache Server, la descripción del proyecto, la instalación y el uso de IA generativa |
| T-42 | Conclusiones y recomendaciones       | Dos conclusiones y dos recomendaciones por integrante                       | Los 5          | En progreso | 60% | Hay 6 conclusiones y 6 recomendaciones de las 10 de cada tipo que exige la rúbrica |
| T-43 | Tabla de funcionalidades             | Qué funciona y qué no, en los cuatro bloques requeridos                     | Los 5          | En progreso | 50% | Completos los bloques del Zonal Cache y del REST API en Node.js con la UI; faltan el DNS Interceptor y el Rest API con el Apache Server |
| T-44 | Pruebas de extremo a extremo         | Validar el sistema con los cuatro orígenes exigidos                         | Los 5          | Pendiente   | 0% | Falta ejecutarlas (P-09) |
| T-45 | Reportes de avance                   | Elaborar y enviar el reporte semanal                                        | Luis Delgado   | Finalizada  | 100% | Ninguno |

**Estados permitidos:** Pendiente / En progreso / Bloqueada / Finalizada.

---

## 3. Commits realizados

Período: del 30/10/2026 al 05/11/2026. No se incluyen los commits de merge de los Pull Requests.

| Integrante          | Fecha      | Commit    | Descripción | Archivos principales modificados |
| ------------------- | ---------- | --------- | ----------- | -------------------------------- |
| Alexandra De Gracia | 01/11/2026 | `6161aee` | feat(orchestration): completa orquestación global con Docker Compose y Helm (T-40) | `docker-compose.yml`, `helm/proxycache-stack/values.yaml`, `helm/deploy.sh`, `helm/deploy.ps1`, `helm/mock-origin/`, `helm/ui/templates/ingress.yaml`, `.env.example` |
| Rafael Araya        | 03/11/2026 | `496cbda` | Ajustes finales del Zonal Cache: configuración desde el API, validación de sesiones y API keys, y prueba de concurrencia | `zonal-cache/src/server.c`, `zonal-cache/src/config_client.c`, `zonal-cache/tests/test_concurrency.c`, `zonal-cache/Makefile`, `zonal-cache/Dockerfile`, `helm/zonal-cache/values.yaml` |
| Luis Delgado        | 05/11/2026 | `2707369` | docs: documenta el mecanismo de seguridad del API (T-32) | `docs/seguridad-api.md`, `docs/modelo-datos.md` |
| Luis Delgado        | 05/11/2026 | `8e25793` | docs: actualiza el README con integrantes, inicio rápido y URLs de producción | `README.md` |
| Luis Delgado        | 05/11/2026 | `92be05b` | fix(helm): quita el token de servicio quemado en los values de node-api y zonal-cache | `helm/node-api/values.yaml`, `helm/zonal-cache/values.yaml` |

Isaac Rojas Robles y Otto Segura no registraron commits durante este período.

---

## 4. Pull Requests (PRs)

| Integrante          | PR     | Descripción | Estado   | Tareas relacionadas |
| ------------------- | ------ | ----------- | -------- | ------------------- |
| Alexandra De Gracia | PR #16 | Orquestación global con Docker Compose y Helm: siete servicios, chart conjunto, subcharts de la UI y del origen de prueba, y scripts de despliegue y desinstalación para Bash y PowerShell | Mergeado | T-40 |
| Rafael Araya        | PR #17 | Ajustes finales del Zonal Cache: configuración desde el API, validación remota de sesiones y API keys, y prueba de concurrencia | Mergeado | T-09 a T-16 |
| Luis Delgado        | PR #18 | Documento del mecanismo de seguridad del API, README y eliminación del token quemado en los Helm Charts | Mergeado | T-32, T-40 |

Isaac Rojas Robles y Otto Segura no crearon Pull Requests durante este período.

---

## 5. Problemas

| ID   | Problema / Bloqueo | Tarea afectada | Responsable | Acción tomada / Próximo paso |
| ---- | ------------------ | -------------- | ----------- | ---------------------------- |
| P-01 | Dos URLs distintas podrían producir el mismo nombre de archivo `.cache` y sobrescribirse | T-02 | Isaac Rojas | Abierto. Usar un hash más largo o guardar la URL original junto al contenido para detectar colisiones |
| P-02 | El índice de la caché no estaba protegido para acceso concurrente | T-03, T-09 | Isaac Rojas, Rafael Araya | **Resuelto.** El servidor protege las operaciones de la caché con un `pthread_mutex_t`, y en `496cbda` se agregó una prueba de concurrencia |
| P-05 | El DNS Interceptor carga los dominios desde una variable de entorno en lugar de consultar los dominios verificados | T-18 | Otto Segura | Abierto. Consumir `GET /api/internal/domains` con libcurl y refrescar la lista periódicamente, manteniendo `CONFIG_DOMAINS` como respaldo |
| P-09 | Las pruebas de extremo a extremo con los cuatro orígenes no se han ejecutado | T-43, T-44 | Los 5 | Ejecutarlas con el stack completo y registrar los resultados en la documentación |
| P-12 | Quedó un token de servicio escrito en los valores por defecto de dos Helm Charts; el enunciado prohíbe valores quemados | T-16, T-40 | Luis Delgado | **Resuelto** en `92be05b`: los valores quedaron vacíos y `deploy.sh` los inyecta desde el entorno |
| P-13 | El Zonal Cache acepta cualquier API key o sesión cuando la petición llega con `Host: localhost` o sin `Host`, y acepta cualquier sesión si no se define `CONFIG_API_URL` | T-13, T-15 | Rafael Araya | Abierto. Rechazar por defecto y dejar `EXPECTED_API_KEY` y `EXPECTED_SESSION_TOKEN` como único modo de prueba local |
| P-14 | El Ingress del Zonal Cache espera el secreto TLS `zonal-cache-tls`, pero ningún script lo crea, así que la SSL termination no queda automatizada | T-16, T-40 | Rafael Araya, Alexandra De Gracia | Abierto. Que `deploy.sh` y `deploy.ps1` creen el secreto, con un certificado autofirmado si no se indica uno |
| P-15 | La geolocalización usa una tabla reducida de rangos IPv4 escrita en `geo.c` en lugar de la base IP to Country del Proyecto 1 que pide el enunciado | T-19 | Otto Segura | Abierto. Cargar la base del Proyecto 1 desde un archivo configurable por variable de entorno |

---

## 6. Resumen de participación individual

| Integrante               | Tareas asignadas | Commits | PRs | Resumen del trabajo realizado |
| ------------------------ | ---------------: | ------: | --: | ----------------------------- |
| Isaac Rojas Robles       |                8 |       0 |   0 | Sin commits en el período |
| Rafael Araya             |                8 |       1 |   1 | Ajustes finales del Zonal Cache: configuración desde el API, validación de sesiones y API keys, y prueba de concurrencia |
| Otto Segura              |                8 |       0 |   0 | Sin commits en el período |
| Luis Diego Delgado Muñoz |                8 |       3 |   1 | Documento del mecanismo de seguridad del API, README, eliminación del token quemado en los Helm Charts, revisión del repositorio contra el enunciado y este reporte |
| Alexandra De Gracia      |                8 |       1 |   1 | Orquestación global del stack con Docker Compose, chart conjunto y scripts de despliegue |

Las tareas transversales T-41 a T-45 no se contabilizan en la columna de tareas asignadas.

---

## 7. Plan para la siguiente semana

| ID           | Tarea / Actividad | Responsable(s) | Resultado esperado |
| ------------ | ----------------- | -------------- | ------------------ |
| T-02         | Resolver la colisión de nombres de archivo (P-01) | Isaac Rojas | Archivos de caché sin riesgo de sobrescritura |
| T-13, T-15, T-16 | Rechazar credenciales no validadas (P-13) y automatizar el secreto TLS (P-14) | Rafael Araya | Autenticación segura por defecto y SSL termination automatizada |
| T-18, T-19   | Dominios desde el API (P-05) y base IP to Country del Proyecto 1 (P-15) | Otto Segura | DNS Interceptor alineado con el enunciado |
| T-40         | Instalar el stack completo en un clúster y apoyar la automatización del secreto TLS (P-14) | Alexandra De Gracia | Stack instalado de forma automatizada |
| T-41 a T-44  | Pruebas de extremo a extremo con los cuatro orígenes, tabla de funcionalidades, conclusiones y documentación | Los 5 | Documentación lista para la entrega |

---

## 8. Observaciones

- Se extendió la fecha de entrega del proyecto, por lo que se presenta este reporte adicional.
- Se revisó el repositorio contra los requisitos del enunciado. Los pendientes encontrados quedaron
  registrados como P-12 a P-15 y se asignaron a sus responsables.
- **REST API en Node.js:** se documentó el mecanismo de autenticación y autorización del API
  (`docs/seguridad-api.md`): Firebase ID token para la UI, autorización por dueño del dominio,
  token de servicio para las cachés y el DNS Interceptor, y manejo de API keys, contraseñas y
  sesiones.
- **Orquestación:** según el PR #16, los ocho charts pasan `helm lint`, se renderizan con
  `helm template` y el script de despliegue en PowerShell pasó la prueba en modo simulación.
