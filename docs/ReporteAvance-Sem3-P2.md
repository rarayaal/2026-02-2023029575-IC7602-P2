# Reporte Semanal de Avance – Proyecto 2

**Curso:** IC7602

**PROYECTO:** 2

**Semana:** 3

**Fecha del reporte:** 22/10/2026


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
| T-02 | Almacenamiento en disco              | Estructura de directorios y lectura/escritura de objetos cacheados          | Isaac Rojas    | Finalizada  | 100% | Posible colisión de nombres de archivo (P-01) |
| T-03 | Índice de entradas en memoria        | Clave dominio más URL, tamaño, TTL y contadores de acceso                   | Isaac Rojas    | Finalizada  | 100% | El índice no está protegido para acceso concurrente (P-02) |
| T-04 | Expiración por TTL                   | Invalidar entradas vencidas según el TTL por tipo de archivo                | Isaac Rojas    | Finalizada  | 100% | Ninguno |
| T-05 | Límite de tamaño por dominio         | Cumplir el tamaño máximo de caché por dominio                              | Isaac Rojas    | Pendiente   | 0% | Ninguno |
| T-06 | Políticas LRU y MRU                  | Algoritmos de reemplazo Least y Most Recently Used                          | Isaac Rojas    | Pendiente   | 0% | Ninguno |
| T-07 | Políticas LFU, FIFO y Random         | Algoritmos de reemplazo Least Frequently Used, First-In First-Out y Random  | Isaac Rojas    | Pendiente   | 0% | Ninguno |
| T-08 | Pruebas unitarias del motor          | Validar cada política y el control de tamaño de forma aislada               | Isaac Rojas    | En progreso | 60% | Faltan las pruebas de las políticas de reemplazo |

### Zonal Cache: servidor HTTP, seguridad y origen · Rafael Araya

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-09 | Servidor HTTP concurrente            | Servidor en GNU C que atiende múltiples peticiones simultáneas              | Rafael Araya   | Finalizada  | 100% | Configuración por variables de entorno y cierre ordenado |
| T-10 | Parseo de peticiones y matching      | Interpretar la petición y asociar la URL con su configuración y wildcards   | Rafael Araya   | Finalizada  | 100% | Matching con wildcards y pruebas unitarias |
| T-11 | Lectura de la configuración          | Obtener la configuración del dominio a través del REST API en Node.js       | Rafael Araya   | En progreso | 30% | Usa variables de entorno como respaldo; falta consumir el endpoint de T-31 (P-04) |
| T-12 | Obtención del recurso desde el origen| Solicitar al origen el recurso ausente, almacenarlo y servirlo              | Rafael Araya   | En progreso | 70% | Integrado con el motor de caché; falta soporte para orígenes HTTPS (P-03) |
| T-13 | Autenticación por `x-api-key`        | Validar peticiones mediante el encabezado de API key                        | Rafael Araya   | En progreso | 60% | Falta validar la key contra el API (P-04) |
| T-14 | Autenticación por usuario y contraseña | Redirigir al formulario de la UI y procesar el resultado                  | Rafael Araya   | En progreso | 70% | Redirección a la UI y ruta `/__zc/session` implementadas |
| T-15 | Verificación de sesión               | Comprobar la sesión en las peticiones posteriores                           | Rafael Araya   | En progreso | 50% | Cookie `zc_session` implementada; falta validarla contra el API (P-04) |
| T-16 | SSL termination y automatización     | Terminación SSL, Dockerfile y Helm Chart del Zonal Cache                    | Rafael Araya   | En progreso | 70% | Dockerfile multietapa y Helm Chart con TLS en el Ingress; falta probarlo desplegado |

### DNS Interceptor, Rest API en Java y Apache Server · Otto Segura

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-17 | Adaptación del DNS Interceptor       | Adaptar el componente del Proyecto 1 al flujo de cachés zonales             | Otto Segura    | Finalizada  | 100% | Ninguno |
| T-18 | Interceptación de dominios           | Interceptar solo los dominios registrados                                   | Otto Segura    | Finalizada  | 100% | Los dominios se cargan por variable de entorno (P-05) |
| T-19 | Selección de caché zonal por país    | Determinar el país con la base IP to Country y elegir la caché              | Otto Segura    | Finalizada  | 100% | Ninguno |
| T-20 | Construcción de la respuesta DNS     | Responder apuntando a la caché zonal seleccionada                           | Otto Segura    | Finalizada  | 100% | Ninguno |
| T-21 | Automatización del DNS Interceptor   | Dockerfile y Helm Chart del componente                                      | Otto Segura    | Finalizada  | 100% | Ninguno |
| T-22 | Rest API en Java                     | API con endpoints GET, POST, PUT y DELETE                                   | Otto Segura    | Pendiente   | 0% | Requerido para las pruebas de extremo a extremo (P-08) |
| T-23 | Automatización del Rest API en Java  | Dockerfile y Helm Chart del componente                                      | Otto Segura    | Pendiente   | 0% | Depende de T-22 |
| T-24 | Apache Server                        | Servidor con una página HTML básica y su Helm Chart                         | Otto Segura    | Pendiente   | 0% | Requerido para las pruebas de extremo a extremo (P-08) |

### REST API en Node.js y modelo de datos · Luis Diego Delgado Muñoz

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-25 | Modelo de datos en Firestore         | Colecciones de usuarios, dominios, URLs, caché, API keys y sesiones         | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-26 | Estructura base del API              | Proyecto Node.js y despliegue automático en Vercel                          | Luis Delgado   | En progreso | 85% | Firebase configurado; el despliegue en Vercel requiere los secrets del repositorio (P-06) |
| T-27 | Endpoints de usuarios                | Registro, autenticación y administración de cuentas                         | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-28 | Endpoints de dominios                | Alta, baja y verificación de propiedad mediante registro TXT                | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-29 | Endpoints de URLs y caché            | URLs con wildcards y configuración por tipo de archivo, TTL y política      | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-30 | Endpoints de API keys y sesiones     | Creación y eliminación de keys; emisión y validación de sesiones            | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-31 | Endpoints para las cachés zonales    | Configuración del dominio y validación de credenciales y sesiones           | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-32 | Mecanismo de seguridad del API       | Investigar, implementar y documentar la autenticación y autorización        | Luis Delgado   | En progreso | 70% | Implementado; falta el documento de seguridad |

### UI y orquestación global · Alexandra De Gracia

| ID   | Tarea                                | Descripción                                                                 | Responsable(s)      | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | ------------------- | ----------- | -----: | --------- |
| T-33 | Estructura base de la UI             | React, Vite y Tailwind CSS con despliegue automático en Vercel              | Alexandra De Gracia | En progreso | 90% | Despliegue en Vercel pendiente (P-06) |
| T-34 | Registro de cuenta y dominio         | Crear cuenta y registrar dominio validado con registro TXT                  | Alexandra De Gracia | En progreso | 70% | Falta la integración con el backend (P-07) |
| T-35 | Administración de dominios           | Agregar y eliminar dominios verificando la propiedad                        | Alexandra De Gracia | En progreso | 70% | Falta la integración con el backend (P-07) |
| T-36 | Administración de URLs               | Crear, eliminar y modificar URLs con wildcards                              | Alexandra De Gracia | En progreso | 70% | Falta la integración con el backend (P-07) |
| T-37 | Configuración de caché por URL       | Tamaño de caché, y por tipo de archivo el TTL y la política                 | Alexandra De Gracia | En progreso | 70% | Falta la integración con el backend (P-07) |
| T-38 | Configuración de autenticación       | API keys y usuarios con contraseña por URL                                  | Alexandra De Gracia | En progreso | 70% | Falta la integración con el backend (P-07) |
| T-39 | Formulario de autenticación y sesión | Formulario usado por las cachés zonales y cierre de sesión                  | Alexandra De Gracia | Pendiente   | 0% | Endpoints de sesión ya disponibles en el API |
| T-40 | Orquestación global del stack        | Docker Compose y despliegue conjunto de los Helm Charts                     | Alexandra De Gracia | En progreso | 10% | Ya existen Helm Charts del DNS Interceptor y del Zonal Cache |

### Tareas transversales · Todo el grupo

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-41 | Documentación técnica por componente | Instrucciones, diagramas y casos de prueba de cada componente               | Los 5          | En progreso | 25% | Ninguno |
| T-42 | Conclusiones y recomendaciones       | Dos conclusiones y dos recomendaciones por integrante                       | Los 5          | Pendiente   | 0% | Ninguno |
| T-43 | Tabla de funcionalidades             | Qué funciona y qué no, en los cuatro bloques requeridos                     | Los 5          | Pendiente   | 0% | Ninguno |
| T-44 | Pruebas de extremo a extremo         | Validar el sistema con los cuatro orígenes exigidos                         | Los 5          | Pendiente   | 0% | Depende de T-22, T-24 y del soporte HTTPS (P-03, P-08) |
| T-45 | Reportes de avance                   | Elaborar y enviar el reporte semanal                                        | Luis Delgado   | En progreso | 75% | Ninguno |

**Estados permitidos:** Pendiente / En progreso / Bloqueada / Finalizada.

---

## 3. Commits realizados

Período: del 16/10/2026 al 22/10/2026. No se incluyen los commits de merge de los Pull Requests.

| Integrante          | Fecha      | Commit    | Descripción | Archivos principales modificados |
| ------------------- | ---------- | --------- | ----------- | -------------------------------- |
| Isaac Rojas Robles  | 18/10/2026 | `7d37264` | feat: implementar contrato e índice en memoria del motor de caché | `zonal-cache/Makefile`, `zonal-cache/include/cache.h`, `zonal-cache/src/cache.c`, `zonal-cache/tests/test_cache.c` |
| Isaac Rojas Robles  | 20/10/2026 | `352dd89` | feat: implementar almacenamiento e integración del motor de caché | `zonal-cache/include/cache.h`, `zonal-cache/src/cache.c`, `zonal-cache/tests/test_cache.c` |
| Luis Delgado        | 21/10/2026 | `e7a52e5` | feat(api): implementa endpoints internos para cachés zonales contra Firestore (T-31) | `node-api/src/routes/internal.js`, `node-api/src/lib/config.js`, `node-api/src/lib/hash.js`, `node-api/test/config.test.js` |
| Luis Delgado        | 21/10/2026 | `91f9fd0` | chore(api): agrega script de datos de prueba en Firestore | `node-api/scripts/seed.js`, `node-api/package.json`, `node-api/README.md`, `node-api/.gitignore` |
| Alexandra De Gracia | 22/10/2026 | `b7dce22` | feat: implementar registro de cuentas y dominios | `src/pages/RegisterAccountPage.jsx`, `src/pages/RegisterDomainPage.jsx`, `src/components/DomainVerificationCard.jsx`, `src/App.jsx` |
| Alexandra De Gracia | 22/10/2026 | `fb247f5` | feat: implementar administración de dominios y URLs | `src/pages/DomainsListPage.jsx`, `src/pages/DomainUrlsPage.jsx`, `src/services/domainService.js` |
| Alexandra De Gracia | 22/10/2026 | `82f999e` | feat: implementar configuración de caché y autenticación por URL | `src/pages/DomainUrlsPage.jsx`, `src/services/urlAuthService.js`, `src/services/urlService.js` |
| Otto Segura         | 22/10/2026 | `4ec12ff` | feat(dns-interceptor): add GeoIP & zonal cache (T-19) | `dns-interceptor/include/geo.h`, `dns-interceptor/src/geo.c`, `dns-interceptor/src/main.c` |
| Isaac Rojas Robles  | 22/10/2026 | `5fd202f` | feat: implementar expiración por TTL en el motor de caché | `zonal-cache/include/cache.h`, `zonal-cache/src/cache.c`, `zonal-cache/tests/test_cache.c` |
| Otto Segura         | 22/10/2026 | `2764a04` | feat(dns): add Docker, Helm & tests | `dns-interceptor/Dockerfile`, `dns-interceptor/tests/test_dns.c`, `helm/dns-interceptor/Chart.yaml`, `helm/dns-interceptor/templates/deployment.yaml`, `helm/dns-interceptor/values.yaml` |
| Luis Delgado        | 22/10/2026 | `bc0f125` | feat(api): implementa endpoints de usuarios, dominios, URLs, API keys y sesiones (T-27 a T-30) | `node-api/src/routes/users.js`, `node-api/src/routes/domains.js`, `node-api/src/routes/urls.js`, `node-api/src/routes/sessions.js`, `node-api/src/middleware/userAuth.js`, `node-api/src/lib/validation.js` |
| Luis Delgado        | 22/10/2026 | `dda9c2a` | test(api): agrega prueba de punta a punta contra Firebase | `node-api/scripts/e2e.js`, `node-api/package.json`, `node-api/.env.example` |
| Luis Delgado        | 22/10/2026 | `ecde242` | docs(api): documenta endpoints, reglas de negocio y despliegue | `node-api/README.md`, `docs/contrato-cache-api.md` |
| Luis Delgado        | 22/10/2026 | `fb25a35` | build: agrega despliegue automático del API a Vercel con GitHub Actions | `.github/workflows/deploy-node-api.yml`, `node-api/test/validation.test.js`, `node-api/test/txt.test.js`, `node-api/test/app.test.js` |
| Rafael Araya        | 22/10/2026 | `7066eeb` | Variables de entorno, matching con wildcards, integración con el motor de caché, autenticación por API key, redirección al login de la UI con `/__zc/session` y cookie, Dockerfile y Helm Chart con SSL termination | `zonal-cache/src/server.c`, `zonal-cache/src/config_client.c`, `zonal-cache/src/http_util.c`, `zonal-cache/tests/test_t10_matching.c`, `zonal-cache/Dockerfile`, `helm/zonal-cache/values.yaml` |

---

## 4. Pull Requests (PRs)

| Integrante          | PR    | Descripción | Estado | Tareas relacionadas |
| ------------------- | ----- | ----------- | ------ | ------------------- |
| Alexandra De Gracia | PR #5 | Registro de cuentas y dominios, administración de dominios y URLs, configuración de caché y autenticación por URL | Mergeado | T-33 a T-38 |
| Isaac Rojas Robles  | PR #6 | Contrato, índice en memoria, almacenamiento en disco y expiración por TTL del motor de caché | Mergeado | T-01 a T-04, T-08 |
| Otto Segura         | PR #7 | Resolución GeoIP, pruebas unitarias, Dockerfile y Helm Chart del DNS Interceptor | Mergeado | T-19, T-21 |
| Luis Delgado        | PR #8 | Endpoints de la UI y de las cachés zonales contra Firestore, prueba de punta a punta y despliegue con GitHub Actions | Mergeado | T-26 a T-32 |
| Rafael Araya        | PR #9 | Configuración por entorno, matching con wildcards, integración con el motor de caché, autenticación, Dockerfile y Helm Chart | Mergeado | T-09 a T-16 |

---

## 5. Problemas

| ID   | Problema / Bloqueo | Tarea afectada | Responsable | Acción tomada / Próximo paso |
| ---- | ------------------ | -------------- | ----------- | ---------------------------- |
| P-01 | Dos URLs distintas podrían producir el mismo nombre de archivo `.cache` y sobrescribirse | T-02 | Isaac Rojas | Usar un hash de 64 o 256 bits, o guardar la URL original junto al contenido para detectar colisiones |
| P-02 | El servidor HTTP es concurrente, pero el índice de la caché todavía no usa `pthread_mutex_t`; dos hilos podrían modificar la misma entrada a la vez | T-03, T-09 | Isaac Rojas, Rafael Araya | Proteger las operaciones del índice con un mutex |
| P-03 | La conexión al origen usa sockets TCP directos, sin soporte para orígenes HTTPS, que exige una de las pruebas de la rúbrica | T-12, T-44 | Rafael Araya | Enlazar libcurl para el handshake TLS hacia el servidor remoto |
| P-04 | El Zonal Cache toma la configuración de variables de entorno y valida la API key y la sesión de forma local, sin consultar el API | T-11, T-13, T-15 | Rafael Araya | Consumir los endpoints de `docs/contrato-cache-api.md`, ya disponibles en `main` |
| P-05 | El DNS Interceptor carga los dominios desde una variable de entorno en lugar de consultar los dominios verificados | T-18 | Otto Segura | Consumir `GET /api/internal/domains` |
| P-06 | El plan gratuito de Vercel bloquea los despliegues desde un repositorio privado cuando el autor del commit no es el dueño de la cuenta | T-26, T-33 | Luis Delgado, Alexandra De Gracia | Se implementó el despliegue con GitHub Actions y la CLI de Vercel; falta que el dueño del repositorio registre los secrets |
| P-07 | La UI debe iniciar sesión con Firebase Authentication y enviar el ID token, que el API exige en los endpoints de dominios y URLs | T-34 a T-38 | Alexandra De Gracia | Agregar el SDK de Firebase, la pantalla de login y el encabezado `Authorization` en el cliente HTTP |
| P-08 | El Rest API en Java y el servidor Apache aún no se iniciaron, y son dos de los cuatro orígenes de las pruebas de extremo a extremo | T-22 a T-24, T-44 | Otto Segura | Iniciarlos a inicios de la semana para dejar tiempo a las pruebas |

---

## 6. Resumen de participación individual

| Integrante               | Tareas asignadas | Commits | PRs | Resumen del trabajo realizado |
| ------------------------ | ---------------: | ------: | --: | ----------------------------- |
| Isaac Rojas Robles       |                8 |       3 |   1 | Interfaz pública, índice en memoria, almacenamiento en disco y expiración por TTL del motor de caché, con pruebas unitarias |
| Rafael Araya             |                8 |       1 |   1 | Configuración por entorno, matching con wildcards, integración con el motor de caché, autenticación por API key y por sesión, Dockerfile y Helm Chart del Zonal Cache |
| Otto Segura              |                8 |       2 |   1 | Selección de caché zonal por país con la base IP to Country, pruebas unitarias, Dockerfile y Helm Chart del DNS Interceptor |
| Luis Diego Delgado Muñoz |                8 |       6 |   1 | Configuración de Firebase, endpoints de usuarios, dominios, URLs, API keys, sesiones y cachés zonales, autenticación del API, pruebas unitarias y de punta a punta, despliegue con GitHub Actions y este reporte |
| Alexandra De Gracia      |                8 |       3 |   1 | Registro de cuentas y dominios, administración de dominios y URLs, y configuración de caché y autenticación por URL en la UI |

Las tareas transversales T-41 a T-45 no se contabilizan en la columna de tareas asignadas.

---

## 7. Plan para la siguiente semana

| ID           | Tarea / Actividad | Responsable(s) | Resultado esperado |
| ------------ | ----------------- | -------------- | ------------------ |
| T-05 a T-08  | Límite de tamaño por dominio, políticas de reemplazo y sus pruebas; resolver P-01 y P-02 | Isaac Rojas | Motor de caché completo y seguro para acceso concurrente |
| T-11, T-12, T-13, T-15 | Consumir el API para la configuración y las validaciones, y soporte HTTPS con libcurl | Rafael Araya | Zonal Cache integrado con el REST API en Node.js y con los cuatro tipos de origen |
| T-22 a T-24  | Rest API en Java y servidor Apache con sus Helm Charts; dominios desde el API (P-05) | Otto Segura | Orígenes de prueba desplegados en Kubernetes |
| T-26, T-32   | Despliegue en Vercel y documento del mecanismo de seguridad | Luis Delgado | API en producción y seguridad documentada |
| T-34 a T-39  | Login con Firebase, integración con el API y formulario de autenticación de las cachés | Alexandra De Gracia | UI funcionando de punta a punta con el backend |
| T-40         | Orquestación global de los Helm Charts | Alexandra De Gracia | Despliegue conjunto del stack automatizado |
| T-41 a T-44  | Documentación, conclusiones, tabla de funcionalidades y pruebas de extremo a extremo | Los 5 | Documentación lista para la entrega del 03/11/2026 |

---

## 8. Observaciones

- **DNS Interceptor:** la decodificación del QNAME, el armado de respuestas según los RFC 1035 y
  2929 y la tabla de rangos IP se portaron de Rust a GNU C. El Dockerfile ejecuta `make test` antes
  de empaquetar la imagen final, de modo que una imagen con pruebas fallidas no se construye.
- **REST API en Node.js:** se configuró el proyecto de Firebase (Firestore, Authentication con correo
  y contraseña, y cuenta de servicio). El API cuenta con 41 pruebas unitarias y una prueba de punta a
  punta de 36 pasos contra Firebase que recorre el flujo de la UI y la vista del Zonal Cache.
- **UI:** los objetivos para la siguiente semana son integrar la interfaz con los servicios del
  backend, garantizar el registro y la administración de cuentas, dominios y URLs, persistir las
  configuraciones de caché y credenciales, y verificar la caché y la autenticación de extremo a
  extremo cuando sus componentes estén disponibles.
- Con los endpoints de T-27 a T-31 ya en `main`, se eliminan las dependencias de backend que
  bloqueaban la UI y el Zonal Cache.
