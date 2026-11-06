# Reporte Semanal de Avance – Proyecto 2

**Curso:** IC7602

**PROYECTO:** 2

**Semana:** 4

**Fecha del reporte:** 29/10/2026


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
| T-02 | Almacenamiento en disco              | Estructura de directorios y lectura/escritura de objetos cacheados          | Isaac Rojas    | Finalizada  | 100% | Colisión de nombres de archivo sin resolver (P-01) |
| T-03 | Índice de entradas en memoria        | Clave dominio más URL, tamaño, TTL y contadores de acceso                   | Isaac Rojas    | Finalizada  | 100% | El índice no está protegido para acceso concurrente (P-02) |
| T-04 | Expiración por TTL                   | Invalidar entradas vencidas según el TTL por tipo de archivo                | Isaac Rojas    | Finalizada  | 100% | Ninguno |
| T-05 | Límite de tamaño por dominio         | Cumplir el tamaño máximo de caché por dominio                              | Isaac Rojas    | Finalizada  | 100% | Ninguno |
| T-06 | Políticas LRU y MRU                  | Algoritmos de reemplazo Least y Most Recently Used                          | Isaac Rojas    | Finalizada  | 100% | Ninguno |
| T-07 | Políticas LFU, FIFO y Random         | Algoritmos de reemplazo Least Frequently Used, First-In First-Out y Random  | Isaac Rojas    | Finalizada  | 100% | Ninguno |
| T-08 | Pruebas unitarias del motor          | Validar cada política y el control de tamaño de forma aislada               | Isaac Rojas    | Finalizada  | 100% | Ninguno |

### Zonal Cache: servidor HTTP, seguridad y origen · Rafael Araya

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-09 | Servidor HTTP concurrente            | Servidor en GNU C que atiende múltiples peticiones simultáneas              | Rafael Araya   | Finalizada  | 100% | Ninguno |
| T-10 | Parseo de peticiones y matching      | Interpretar la petición y asociar la URL con su configuración y wildcards   | Rafael Araya   | Finalizada  | 100% | Ninguno |
| T-11 | Lectura de la configuración          | Obtener la configuración del dominio a través del REST API en Node.js       | Rafael Araya   | En progreso | 90% | Consume `GET /api/internal/domains/:domain/config` con respaldo en variables de entorno (P-04 resuelto); falta probarlo contra el API desplegado |
| T-12 | Obtención del recurso desde el origen| Solicitar al origen el recurso ausente, almacenarlo y servirlo              | Rafael Araya   | En progreso | 90% | Soporte de orígenes HTTPS con libcurl (P-03 resuelto); falta probarlo contra un sitio externo con HTTPS |
| T-13 | Autenticación por `x-api-key`        | Validar peticiones mediante el encabezado de API key                        | Rafael Araya   | En progreso | 90% | Valida la key contra el API (P-04 resuelto); falta probarlo contra el API desplegado |
| T-14 | Autenticación por usuario y contraseña | Redirigir al formulario de la UI y procesar el resultado                  | Rafael Araya   | En progreso | 70% | Redirección a la UI y ruta `/__zc/session` implementadas; falta probarlas con el formulario de la UI |
| T-15 | Verificación de sesión               | Comprobar la sesión en las peticiones posteriores                           | Rafael Araya   | En progreso | 90% | Valida la cookie `zc_session` contra el API (P-04 resuelto); falta probarlo contra el API desplegado |
| T-16 | SSL termination y automatización     | Terminación SSL, Dockerfile y Helm Chart del Zonal Cache                    | Rafael Araya   | En progreso | 70% | Dockerfile multietapa y Helm Chart con TLS en el Ingress; falta probarlo desplegado |

### DNS Interceptor, Rest API en Java y Apache Server · Otto Segura

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-17 | Adaptación del DNS Interceptor       | Adaptar el componente del Proyecto 1 al flujo de cachés zonales             | Otto Segura    | Finalizada  | 100% | Ninguno |
| T-18 | Interceptación de dominios           | Interceptar solo los dominios registrados                                   | Otto Segura    | Finalizada  | 100% | Los dominios se cargan por variable de entorno (P-05) |
| T-19 | Selección de caché zonal por país    | Determinar el país con la base IP to Country y elegir la caché              | Otto Segura    | Finalizada  | 100% | Ninguno |
| T-20 | Construcción de la respuesta DNS     | Responder apuntando a la caché zonal seleccionada                           | Otto Segura    | Finalizada  | 100% | Ninguno |
| T-21 | Automatización del DNS Interceptor   | Dockerfile y Helm Chart del componente                                      | Otto Segura    | Finalizada  | 100% | Ninguno |
| T-22 | Rest API en Java                     | API con endpoints GET, POST, PUT y DELETE                                   | Otto Segura    | Finalizada  | 100% | Ninguno (P-08 resuelto) |
| T-23 | Automatización del Rest API en Java  | Dockerfile y Helm Chart del componente                                      | Otto Segura    | Finalizada  | 100% | Ninguno |
| T-24 | Apache Server                        | Servidor con una página HTML básica y su Helm Chart                         | Otto Segura    | Finalizada  | 100% | Ninguno (P-08 resuelto) |

### REST API en Node.js y modelo de datos · Luis Diego Delgado Muñoz

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-25 | Modelo de datos en Firestore         | Colecciones de usuarios, dominios, URLs, caché, API keys y sesiones         | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-26 | Estructura base del API              | Proyecto Node.js y despliegue automático en Vercel                          | Luis Delgado   | Finalizada  | 100% | Ninguno (P-06 resuelto: `firebase-admin` 13 y workflows ajustados; API desplegada en Vercel) |
| T-27 | Endpoints de usuarios                | Registro, autenticación y administración de cuentas                         | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-28 | Endpoints de dominios                | Alta, baja y verificación de propiedad mediante registro TXT                | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-29 | Endpoints de URLs y caché            | URLs con wildcards y configuración por tipo de archivo, TTL y política      | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-30 | Endpoints de API keys y sesiones     | Creación y eliminación de keys; emisión y validación de sesiones            | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-31 | Endpoints para las cachés zonales    | Configuración del dominio y validación de credenciales y sesiones           | Luis Delgado   | Finalizada  | 100% | Ninguno |
| T-32 | Mecanismo de seguridad del API       | Investigar, implementar y documentar la autenticación y autorización        | Luis Delgado   | En progreso | 70% | Implementado; falta el documento de seguridad |

### UI y orquestación global · Alexandra De Gracia

| ID   | Tarea                                | Descripción                                                                 | Responsable(s)      | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | ------------------- | ----------- | -----: | --------- |
| T-33 | Estructura base de la UI             | React, Vite y Tailwind CSS con despliegue automático en Vercel              | Alexandra De Gracia | Finalizada  | 100% | Ninguno (P-06 resuelto: workflow de despliegue ajustado; UI desplegada en Vercel) |
| T-34 | Registro de cuenta y dominio         | Crear cuenta y registrar dominio validado con registro TXT                  | Alexandra De Gracia | En progreso | 90% | Integrado con el backend y con Firebase Authentication (P-07 resuelto); falta la prueba de extremo a extremo |
| T-35 | Administración de dominios           | Agregar y eliminar dominios verificando la propiedad                        | Alexandra De Gracia | En progreso | 90% | Integrado con el backend; falta la prueba de extremo a extremo |
| T-36 | Administración de URLs               | Crear, eliminar y modificar URLs con wildcards                              | Alexandra De Gracia | En progreso | 90% | Integrado con el backend; falta la prueba de extremo a extremo |
| T-37 | Configuración de caché por URL       | Tamaño de caché, y por tipo de archivo el TTL y la política                 | Alexandra De Gracia | En progreso | 90% | Integrado con el backend; falta la prueba de extremo a extremo |
| T-38 | Configuración de autenticación       | API keys y usuarios con contraseña por URL                                  | Alexandra De Gracia | En progreso | 90% | Integrado con el backend; falta la prueba de extremo a extremo |
| T-39 | Formulario de autenticación y sesión | Formulario usado por las cachés zonales y cierre de sesión                  | Alexandra De Gracia | En progreso | 90% | Formulario y servicio de sesión implementados; falta probarlos con el Zonal Cache |
| T-40 | Orquestación global del stack        | Docker Compose y despliegue conjunto de los Helm Charts                     | Alexandra De Gracia | En progreso | 70% | Docker Compose, chart conjunto y scripts de despliegue creados; falta validar el despliegue conjunto con los charts del Rest API en Java y del Apache Server, disponibles desde el 29/10 |

### Tareas transversales · Todo el grupo

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-41 | Documentación técnica por componente | Instrucciones, diagramas y casos de prueba de cada componente               | Los 5          | En progreso | 25% | Pendiente de completar antes de la entrega (P-09) |
| T-42 | Conclusiones y recomendaciones       | Dos conclusiones y dos recomendaciones por integrante                       | Los 5          | Pendiente   | 0% | Ninguno |
| T-43 | Tabla de funcionalidades             | Qué funciona y qué no, en los cuatro bloques requeridos                     | Los 5          | Pendiente   | 0% | Ninguno |
| T-44 | Pruebas de extremo a extremo         | Validar el sistema con los cuatro orígenes exigidos                         | Los 5          | Pendiente   | 0% | Ya no depende de T-22, T-24 ni del soporte HTTPS; falta ejecutarlas (P-09) |
| T-45 | Reportes de avance                   | Elaborar y enviar el reporte semanal                                        | Luis Delgado   | Finalizada  | 100% | Ninguno |

**Estados permitidos:** Pendiente / En progreso / Bloqueada / Finalizada.

---

## 3. Commits realizados

Período: del 23/10/2026 al 29/10/2026. No se incluyen los commits de merge de los Pull Requests.

| Integrante          | Fecha      | Commit    | Descripción | Archivos principales modificados |
| ------------------- | ---------- | --------- | ----------- | -------------------------------- |
| Isaac Rojas Robles  | 25/10/2026 | `da4e12f` | feat: implementar límites y políticas de reemplazo | `zonal-cache/include/cache.h`, `zonal-cache/src/cache.c`, `zonal-cache/tests/test_cache.c` |
| Alexandra De Gracia | 25/10/2026 | `1eebef9` | feat: integración Firebase y orquestación global (T-39/T-40) | `src/services/firebase.js`, `src/context/AuthContext.jsx`, `src/pages/LoginPage.jsx`, `src/pages/CacheLoginPage.jsx`, `docker-compose.yml`, `helm/proxycache-stack/Chart.yaml`, `helm/deploy.sh`, `.github/workflows/deploy-ui.yml` |
| Luis Delgado        | 26/10/2026 | `3f5c76b` | fix(api): usa firebase-admin 13 para que la función cargue en Vercel | `node-api/package.json`, `node-api/package-lock.json` |
| Luis Delgado        | 26/10/2026 | `23465bc` | fix: evita el bloqueo de Vercel por autor del commit en los despliegues | `.github/workflows/deploy-node-api.yml`, `.github/workflows/deploy-ui.yml` |
| Luis Delgado        | 26/10/2026 | `5451115` | chore: ignora archivos locales de Vercel | `.gitignore`, `node-api/.gitignore` |
| Isaac Rojas Robles  | 28/10/2026 | `12af5d8` | feat: completar pruebas y validación del motor de caché | `zonal-cache/Makefile`, `zonal-cache/tests/test_cache.c` |
| Alexandra De Gracia | 29/10/2026 | `fc88f0c` | fix(ui): restaura validaciones y funciones en la interfaz clara | `src/pages/DomainUrlsPage.jsx`, `src/pages/DomainsListPage.jsx`, `src/pages/LoginPage.jsx`, `src/services/domainService.js`, `src/services/urlService.js`, `src/index.css`, `test/domainService.test.mjs` y otros archivos de `src/` y `test/` (28 en total) |
| Alexandra De Gracia | 29/10/2026 | `c6b01e4` | feat(ui): inicio directo en login y visibilidad condicional de dominios | `src/App.jsx`, `src/components/Navbar.jsx`, `src/pages/NotFoundPage.jsx` |
| Otto Segura         | 29/10/2026 | `b8e698d` | feat(api-java): add CRUD, Docker & Helm | `rest-api-java/src/main/java/cr/ac/tec/restapi/Main.java`, `rest-api-java/src/main/java/cr/ac/tec/restapi/Item.java`, `rest-api-java/pom.xml`, `rest-api-java/Dockerfile`, `helm/rest-api-java/values.yaml`, `helm/rest-api-java/templates/deployment.yaml` |
| Otto Segura         | 29/10/2026 | `04dd4cc` | feat(apache): add static origin, Docker & Helm | `apache-server/Dockerfile`, `apache-server/public-html/index.html`, `helm/apache-server/values.yaml`, `helm/apache-server/templates/deployment.yaml`, `helm/apache-server/templates/service.yaml` |
| Rafael Araya        | 29/10/2026 | `3de73ba` | feat(zonal-cache): add HTTPS origin support with libcurl and remote API validation | `zonal-cache/src/server.c`, `zonal-cache/src/config_client.c`, `zonal-cache/include/config_client.h`, `zonal-cache/Makefile` |

---

## 4. Pull Requests (PRs)

| Integrante          | PR     | Descripción | Estado   | Tareas relacionadas |
| ------------------- | ------ | ----------- | -------- | ------------------- |
| Alexandra De Gracia | PR #10 | Integración de Firebase Authentication en la UI, gestión de sesiones de caché, Docker Compose y Helm Charts para la orquestación del stack | Mergeado | T-33, T-34 a T-40 |
| Luis Delgado        | PR #11 | Correcciones del despliegue en Vercel (`firebase-admin` 13 y workflows de GitHub Actions) y `.gitignore` | Mergeado | T-26 |
| Isaac Rojas Robles  | PR #12 | Límites por dominio, políticas de reemplazo y pruebas del motor de caché | Mergeado | T-05 a T-08 |
| Alexandra De Gracia | PR #13 | Integración de cambios de la rama Alexandra: validaciones, inicio en login y visibilidad condicional de dominios | Mergeado | T-34 a T-39 |
| Otto Segura         | PR #14 | Rest API en Java y servidor Apache con sus Dockerfiles y Helm Charts | Mergeado | T-22, T-23, T-24 |
| Rafael Araya        | PR #15 | Soporte de orígenes HTTPS con libcurl y validación remota de API keys y sesiones contra el API de Node.js | Mergeado | T-11, T-12, T-13, T-15 |

---

## 5. Problemas

| ID   | Problema / Bloqueo | Tarea afectada | Responsable | Acción tomada / Próximo paso |
| ---- | ------------------ | -------------- | ----------- | ---------------------------- |
| P-01 | Dos URLs distintas podrían producir el mismo nombre de archivo `.cache` y sobrescribirse | T-02 | Isaac Rojas | Abierto. El nombre del archivo se calcula con un hash de 32 bits sobre la URL y no se guarda la URL junto al contenido. Usar un hash más largo o guardar la URL original para detectar colisiones |
| P-02 | El servidor HTTP es concurrente, pero `cache.c` no usa `pthread_mutex_t` para proteger el índice | T-03, T-09 | Isaac Rojas, Rafael Araya | Abierto. Proteger las operaciones del índice y del almacenamiento con un mutex, y cubrirlo con una prueba de concurrencia |
| P-03 | La conexión al origen usaba sockets TCP directos, sin soporte para orígenes HTTPS | T-12, T-44 | Rafael Araya | **Resuelto** en `3de73ba` (PR #15) con libcurl para HTTPS. Próximo paso: probarlo contra un sitio externo con HTTPS |
| P-04 | El Zonal Cache tomaba la configuración y validaba credenciales de forma local, sin consultar el API | T-11, T-13, T-15 | Rafael Araya | **Resuelto** en `3de73ba` (PR #15): consume los endpoints internos del API y conserva las variables de entorno como respaldo. Próximo paso: probarlo contra el API desplegado |
| P-05 | El DNS Interceptor carga los dominios desde una variable de entorno en lugar de consultar los dominios verificados | T-18 | Otto Segura | Abierto. `main.c` carga los dominios desde la variable de entorno `CONFIG_DOMAINS` y el componente no tiene cliente HTTP. Consumir `GET /api/internal/domains` |
| P-06 | El plan gratuito de Vercel bloquea los despliegues desde un repositorio privado cuando el autor del commit no es el dueño de la cuenta | T-26, T-33 | Luis Delgado, Alexandra De Gracia | **Resuelto** con los ajustes a los workflows de despliegue (`23465bc`) y a la versión de `firebase-admin` (`3f5c76b`). El API y la UI quedaron desplegados en Vercel |
| P-07 | La UI debía iniciar sesión con Firebase Authentication y enviar el ID token al API | T-34 a T-38 | Alexandra De Gracia | **Resuelto** en `1eebef9` (PR #10): se agregó el SDK de Firebase, el contexto de autenticación, la pantalla de login y el cliente HTTP actualizado |
| P-08 | El Rest API en Java y el servidor Apache no estaban iniciados, y son dos de los cuatro orígenes de las pruebas de extremo a extremo | T-22 a T-24, T-44 | Otto Segura | **Resuelto** en `b8e698d` y `04dd4cc` (PR #14). Próximo paso: desplegarlos en Kubernetes para las pruebas |
| P-09 | La documentación y las pruebas de extremo a extremo quedan para los últimos días antes de la entrega del 03/11 | T-41, T-43, T-44 | Los 5 | Repartir la documentación por componente y ejecutar las pruebas de extremo a extremo con los cuatro orígenes antes de la entrega |
| P-10 | Firebase: faltaban variables de configuración para habilitar la autenticación | T-34 a T-39 | Alexandra De Gracia | **Resuelto.** Las variables se documentaron y se configuraron correctamente para permitir la autenticación |
| P-11 | Docker Compose: faltaban credenciales y tokens para el arranque | T-40 | Alexandra De Gracia | **Resuelto.** Se agregaron validaciones y configuración segura para garantizar el arranque correcto |

---

## 6. Resumen de participación individual

| Integrante               | Tareas asignadas | Commits | PRs | Resumen del trabajo realizado |
| ------------------------ | ---------------: | ------: | --: | ----------------------------- |
| Isaac Rojas Robles       |                8 |       2 |   1 | Límite de tamaño por dominio, políticas de reemplazo LRU, MRU, LFU, FIFO y Random, y pruebas del motor de caché |
| Rafael Araya             |                8 |       1 |   1 | Soporte de orígenes HTTPS con libcurl, consumo de la configuración del dominio desde el API y validación remota de API keys y sesiones |
| Otto Segura              |                8 |       2 |   1 | Rest API en Java con GET, POST, PUT y DELETE, servidor Apache con su HTML, y Dockerfiles y Helm Charts de ambos |
| Luis Diego Delgado Muñoz |                8 |       3 |   1 | Correcciones del despliegue del API en Vercel (`firebase-admin` 13 y workflows de GitHub Actions) y este reporte |
| Alexandra De Gracia      |                8 |       3 |   2 | Integración de la UI con Firebase Authentication y con el backend, formulario de autenticación de las cachés, Docker Compose y chart conjunto del stack, y ajustes de la interfaz |

Las tareas transversales T-41 a T-45 no se contabilizan en la columna de tareas asignadas.

---

## 7. Plan para la siguiente semana

| ID           | Tarea / Actividad | Responsable(s) | Resultado esperado |
| ------------ | ----------------- | -------------- | ------------------ |
| T-02, T-03   | Resolver P-01 y P-02 y probar el motor integrado con el servidor HTTP | Isaac Rojas | Motor de caché seguro ante colisiones y acceso concurrente |
| T-11 a T-16  | Probar el Zonal Cache contra el API desplegado, el formulario de la UI y un origen HTTPS externo; validar el despliegue con TLS | Rafael Araya | Zonal Cache integrado y probado con los cuatro tipos de origen |
| T-18, T-22 a T-24 | Consumir los dominios desde el API (P-05) y desplegar el Rest API en Java y el Apache en Kubernetes | Otto Segura | Orígenes de prueba desplegados y DNS Interceptor sin dominios fijos |
| T-32         | Redactar el documento del mecanismo de seguridad del API | Luis Delgado | Seguridad documentada |
| T-33 a T-39  | Prueba de extremo a extremo de la UI con el API desplegado y con el Zonal Cache | Alexandra De Gracia | UI funcionando de punta a punta |
| T-40         | Validar el despliegue conjunto del stack con todos los Helm Charts | Alexandra De Gracia | Stack completo instalable de forma automatizada |
| T-41 a T-44  | Documentación por componente, conclusiones, tabla de funcionalidades y pruebas de extremo a extremo | Los 5 | Entrega completa el 03/11/2026 |

---

## 8. Observaciones

- **Zonal Cache:** el servidor consulta la configuración del dominio al API de Node.js mediante
  `GET /api/internal/domains/:domain/config` y valida las API keys y las cookies de sesión de forma
  remota. Las variables de entorno se mantienen como respaldo. Los orígenes HTTP siguen usando
  sockets TCP directos, y los orígenes HTTPS se atienden con libcurl, enlazada desde el Makefile.
  El motor de caché ya cuenta con el límite de tamaño por dominio y las cinco políticas de
  reemplazo, con sus pruebas unitarias.
- **Rest API en Java y Apache Server:** ambos orígenes de prueba cuentan con Dockerfile y Helm Chart.
  El API implementa operaciones CRUD sobre un recurso `Item` y el Apache sirve una página HTML
  estática. Con ellos y con el soporte HTTPS del Zonal Cache, ya se dispone de los cuatro orígenes
  que exige la rúbrica para las pruebas de extremo a extremo.
- **UI:** la aplicación inicia sesión con Firebase Authentication y envía el ID token al API. Se
  agregaron rutas protegidas, el formulario de autenticación que utilizan las cachés zonales y un
  servicio de sesión. La orquestación incluye Docker Compose, un chart conjunto del stack y scripts
  de instalación y desinstalación para Linux y para PowerShell. Las pruebas de los servicios de la
  UI se actualizaron junto con las validaciones restauradas en la interfaz clara.
- **UI y orquestación:** la interfaz compila correctamente, incluidas las validaciones y la
  seguridad. El acceso y las funciones administrativas están protegidos mediante autenticación, y
  Docker Compose y Helm fueron validados correctamente.
- **REST API en Node.js:** se corrigió la versión de `firebase-admin` para que la función cargue en
  Vercel, y los workflows de GitHub Actions se ajustaron para que el autor del commit no bloquee
  los despliegues. Tanto el API como la UI quedaron desplegadas en Vercel.

