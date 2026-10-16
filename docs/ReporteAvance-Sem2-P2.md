# Reporte Semanal de Avance – Proyecto 2

**Curso:** IC7602

**PROYECTO:** 2

**Semana:** 2

**Fecha del reporte:** 15/10/2026


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

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado    | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | --------- | -----: | --------- |
| T-01 | Interfaz pública del motor de caché  | Definir `cache.h` con los tipos y firmas que forman el contrato con el servidor HTTP | Isaac Rojas | Pendiente | 0% | Sin avance registrado en el repositorio (P-01) |
| T-02 | Almacenamiento en disco              | Estructura de directorios y lectura/escritura de objetos cacheados          | Isaac Rojas    | Pendiente | 0% | Depende de T-01 |
| T-03 | Índice de entradas en memoria        | Clave dominio más URL, tamaño, TTL y contadores de acceso                   | Isaac Rojas    | Pendiente | 0% | Depende de T-01 |
| T-04 | Expiración por TTL                   | Invalidar entradas vencidas según el TTL por tipo de archivo                | Isaac Rojas    | Pendiente | 0% | Ninguno |
| T-05 | Límite de tamaño por dominio         | Cumplir el tamaño máximo de caché por dominio                              | Isaac Rojas    | Pendiente | 0% | Ninguno |
| T-06 | Políticas LRU y MRU                  | Algoritmos de reemplazo Least y Most Recently Used                          | Isaac Rojas    | Pendiente | 0% | Ninguno |
| T-07 | Políticas LFU, FIFO y Random         | Algoritmos de reemplazo Least Frequently Used, First-In First-Out y Random  | Isaac Rojas    | Pendiente | 0% | Ninguno |
| T-08 | Pruebas unitarias del motor          | Validar cada política y el control de tamaño de forma aislada               | Isaac Rojas    | Pendiente | 0% | Ninguno |

### Zonal Cache: servidor HTTP, seguridad y origen · Rafael Araya

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-09 | Servidor HTTP concurrente            | Servidor en GNU C que atiende múltiples peticiones simultáneas              | Rafael Araya   | En progreso | 60% | Puerto quemado en el código (P-03) |
| T-10 | Parseo de peticiones y matching      | Interpretar la petición y asociar la URL con su configuración y wildcards   | Rafael Araya   | En progreso | 30% | Falta el matching de URLs con wildcards |
| T-11 | Lectura de la configuración          | Obtener la configuración del dominio a través del REST API en Node.js       | Rafael Araya   | Pendiente   | 0% | Contrato ya definido en `docs/contrato-cache-api.md` |
| T-12 | Obtención del recurso desde el origen| Solicitar al origen el recurso ausente, almacenarlo y servirlo              | Rafael Araya   | En progreso | 40% | Origen quemado (`httpbin.org`) (P-03) |
| T-13 | Autenticación por `x-api-key`        | Validar peticiones mediante el encabezado de API key                        | Rafael Araya   | En progreso | 30% | Solo verifica la presencia del encabezado, falta validarlo contra el API |
| T-14 | Autenticación por usuario y contraseña | Redirigir al formulario de la UI y procesar el resultado                  | Rafael Araya   | Pendiente   | 0% | Flujo ya definido en el contrato |
| T-15 | Verificación de sesión               | Comprobar la sesión en las peticiones posteriores                           | Rafael Araya   | Pendiente   | 0% | Ninguno |
| T-16 | SSL termination y automatización     | Terminación SSL, Dockerfile y Helm Chart del Zonal Cache                    | Rafael Araya   | Pendiente   | 0% | Ninguno |

### DNS Interceptor, Rest API en Java y Apache Server · Otto Segura

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-17 | Adaptación del DNS Interceptor       | Adaptar el componente del Proyecto 1 al flujo de cachés zonales             | Otto Segura    | En progreso | 70% | Ninguno |
| T-18 | Interceptación de dominios           | Interceptar solo los dominios registrados                                   | Otto Segura    | En progreso | 60% | Dominios cargados de forma provisional en el código (P-04) |
| T-19 | Selección de caché zonal por país    | Determinar el país con la base IP to Country y elegir la caché              | Otto Segura    | En progreso | 20% | El país todavía es fijo; falta integrar la base IP to Country |
| T-20 | Construcción de la respuesta DNS     | Responder apuntando a la caché zonal seleccionada                           | Otto Segura    | En progreso | 60% | Ninguno |
| T-21 | Automatización del DNS Interceptor   | Dockerfile y Helm Chart del componente                                      | Otto Segura    | Pendiente   | 0% | Ninguno |
| T-22 | Rest API en Java                     | API con endpoints GET, POST, PUT y DELETE                                   | Otto Segura    | Pendiente   | 0% | Ninguno |
| T-23 | Automatización del Rest API en Java  | Dockerfile y Helm Chart del componente                                      | Otto Segura    | Pendiente   | 0% | Ninguno |
| T-24 | Apache Server                        | Servidor con una página HTML básica y su Helm Chart                         | Otto Segura    | Pendiente   | 0% | Ninguno |

### REST API en Node.js y modelo de datos · Luis Diego Delgado Muñoz

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-25 | Modelo de datos en Firestore         | Colecciones de usuarios, dominios, URLs, caché, API keys y sesiones         | Luis Delgado   | En progreso | 90% | Pendiente la revisión del equipo |
| T-26 | Estructura base del API              | Proyecto Node.js y despliegue automático en Vercel                          | Luis Delgado   | En progreso | 70% | Falta crear el proyecto de Firebase y vincular Vercel (P-05) |
| T-27 | Endpoints de usuarios                | Registro, autenticación y administración de cuentas                         | Luis Delgado   | Pendiente   | 0% | Depende de T-26 |
| T-28 | Endpoints de dominios                | Alta, baja y verificación de propiedad mediante registro TXT                | Luis Delgado   | Pendiente   | 0% | Ninguno |
| T-29 | Endpoints de URLs y caché            | URLs con wildcards y configuración por tipo de archivo, TTL y política      | Luis Delgado   | Pendiente   | 0% | Ninguno |
| T-30 | Endpoints de API keys y sesiones     | Creación y eliminación de keys; emisión y validación de sesiones            | Luis Delgado   | Pendiente   | 0% | Ninguno |
| T-31 | Endpoints para las cachés zonales    | Configuración del dominio y validación de credenciales y sesiones           | Luis Delgado   | En progreso | 30% | Contrato y rutas definidos; falta la lógica contra Firestore |
| T-32 | Mecanismo de seguridad del API       | Investigar, implementar y documentar la autenticación y autorización        | Luis Delgado   | En progreso | 20% | Implementado el token de servicio; falta la autenticación de la UI y la documentación |

### UI y orquestación global · Alexandra De Gracia

| ID   | Tarea                                | Descripción                                                                 | Responsable(s)      | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | ------------------- | ----------- | -----: | --------- |
| T-33 | Estructura base de la UI             | React, Vite y Tailwind CSS con despliegue automático en Vercel              | Alexandra De Gracia | En progreso | 80% | Falta verificar el despliegue en Vercel; UI ubicada en la raíz del repositorio (P-02) |
| T-34 | Registro de cuenta y dominio         | Crear cuenta y registrar dominio validado con registro TXT                  | Alexandra De Gracia | Pendiente   | 0% | Depende de T-27 y T-28 |
| T-35 | Administración de dominios           | Agregar y eliminar dominios verificando la propiedad                        | Alexandra De Gracia | Pendiente   | 0% | Depende de T-28 |
| T-36 | Administración de URLs               | Crear, eliminar y modificar URLs con wildcards                              | Alexandra De Gracia | Pendiente   | 0% | Depende de T-29 |
| T-37 | Configuración de caché por URL       | Tamaño de caché, y por tipo de archivo el TTL y la política                 | Alexandra De Gracia | Pendiente   | 0% | Depende de T-29 |
| T-38 | Configuración de autenticación       | API keys y usuarios con contraseña por URL                                  | Alexandra De Gracia | Pendiente   | 0% | Depende de T-30 |
| T-39 | Formulario de autenticación y sesión | Formulario usado por las cachés zonales y cierre de sesión                  | Alexandra De Gracia | Pendiente   | 0% | Flujo ya definido en el contrato |
| T-40 | Orquestación global del stack        | Docker Compose y despliegue conjunto de los Helm Charts                     | Alexandra De Gracia | En progreso | 10% | Ninguno; existe Dockerfile y Docker Compose de la UI |

### Tareas transversales · Todo el grupo

| ID   | Tarea                                | Descripción                                                                 | Responsable(s) | Estado      | Avance | Problemas |
| ---- | ------------------------------------ | --------------------------------------------------------------------------- | -------------- | ----------- | -----: | --------- |
| T-41 | Documentación técnica por componente | Instrucciones, diagramas y casos de prueba de cada componente               | Los 5          | En progreso | 10% | Ninguno |
| T-42 | Conclusiones y recomendaciones       | Dos conclusiones y dos recomendaciones por integrante                       | Los 5          | Pendiente   | 0% | Ninguno |
| T-43 | Tabla de funcionalidades             | Qué funciona y qué no, en los cuatro bloques requeridos                     | Los 5          | Pendiente   | 0% | Ninguno |
| T-44 | Pruebas de extremo a extremo         | Validar el sistema con los cuatro orígenes exigidos                         | Los 5          | Pendiente   | 0% | Depende de la integración de los componentes |
| T-45 | Reportes de avance                   | Elaborar y enviar el reporte semanal                                        | Luis Delgado   | En progreso | 50% | Ninguno |

**Estados permitidos:** Pendiente / En progreso / Bloqueada / Finalizada.

---

## 3. Commits realizados

Período: del 09/10/2026 al 15/10/2026. No se incluyen los commits de merge de los Pull Requests.

| Integrante          | Fecha      | Commit    | Descripción | Archivos principales modificados |
| ------------------- | ---------- | --------- | ----------- | -------------------------------- |
| Otto Segura         | 15/10/2026 | `d7bbd5a` | feat: add UDP DNS interceptor & parser (T-17) | `.gitignore`, `dns-interceptor/Makefile`, `dns-interceptor/include/dns.h`, `dns-interceptor/src/dns.c`, `dns-interceptor/src/main.c` |
| Otto Segura         | 15/10/2026 | `9973910` | feat: filter and intercept registered domains (T-18) | `dns-interceptor/include/domains.h`, `dns-interceptor/src/domains.c`, `dns-interceptor/src/dns.c`, `dns-interceptor/src/main.c` |
| Rafael Araya        | 15/10/2026 | `c994908` | Servidor HTTP concurrente con pthread, parseo de la petición, validación preliminar de `x-api-key` y obtención del recurso desde el origen | `zonal-cache/src/server.c` |
| Alexandra De Gracia | 15/10/2026 | `ca61585` | Setup inicial: scripts de commit, .gitignore y configuración del editor | `.gitignore`, `.vscode/settings.json`, `GEMINI.md`, `commit.sh` |
| Alexandra De Gracia | 15/10/2026 | `caebbbc` | chore: eliminar scripts y configuraciones iniciales, dejando únicamente README.md | `.gitignore`, `.vscode/settings.json`, `GEMINI.md`, `commit.sh` |
| Alexandra De Gracia | 15/10/2026 | `95c60a0` | feat(ui): estructura base React + Vite + Tailwind (T-33) | `package.json`, `vite.config.js`, `tailwind.config.js`, `src/App.jsx`, `src/layouts/MainLayout.jsx`, `src/pages/HomePage.jsx` |
| Alexandra De Gracia | 15/10/2026 | `8999c16` | feat(ui): configura estructura base y despliegue | `Dockerfile`, `docker-compose.yml`, `nginx.conf`, `vercel.json`, `src/services/apiClient.js`, `src/utils/config.js` |
| Luis Delgado        | 15/10/2026 | `c478523` | docs: se define modelo de datos en Firestore (T-25) | `docs/modelo-datos.md` |
| Luis Delgado        | 15/10/2026 | `5bbffb5` | docs: se define contrato del API con cachés zonales y DNS interceptor (T-31) | `docs/contrato-cache-api.md` |
| Luis Delgado        | 15/10/2026 | `5f9e380` | feat(api): crea estructura base del API en Node.js para Vercel (T-26) | `node-api/src/app.js`, `node-api/src/middleware/serviceAuth.js`, `node-api/src/routes/internal.js`, `node-api/api/index.js`, `node-api/test/app.test.js`, `node-api/README.md` |

Isaac Rojas Robles no registró commits durante este período.

---

## 4. Pull Requests (PRs)

| Integrante          | PR    | Descripción | Estado | Tareas relacionadas |
| ------------------- | ----- | ----------- | ------ | ------------------- |
| Rafael Araya        | PR #1 | Servidor HTTP concurrente del Zonal Cache con parseo, validación preliminar de API key y obtención desde el origen | Mergeado | T-09, T-10, T-12, T-13 |
| Otto Segura         | PR #2 | Arquitectura base UDP del DNS Interceptor e interceptación de dominios | Mergeado | T-17, T-18, T-20 |
| Alexandra De Gracia | PR #3 | Estructura base de la UI con React, Vite y Tailwind, y configuración de despliegue | Mergeado | T-33, T-40 |
| Luis Delgado        | PR #4 | Modelo de datos, contrato con las cachés y estructura base del API en Node.js | Mergeado | T-25, T-26, T-31, T-32 |

Isaac Rojas Robles no creó Pull Requests durante este período.

---

## 5. Problemas

| ID   | Problema / Bloqueo | Tarea afectada | Responsable | Acción tomada / Próximo paso |
| ---- | ------------------ | -------------- | ----------- | ---------------------------- |
| P-01 | No hay avance registrado del motor de caché, y `cache.h` es una dependencia del servidor HTTP | T-01 a T-08, T-12 | Isaac Rojas | Publicar `cache.h` a inicios de la semana y acordarlo con Rafael Araya |
| P-02 | La UI quedó en la raíz del repositorio, mezclada con los demás componentes, y su `vercel.json` y `package.json` pueden interferir con el despliegue del API en Node.js | T-33, T-26 | Alexandra De Gracia | Mover la UI a una carpeta propia (`ui/`) y configurar el *Root Directory* de cada proyecto en Vercel |
| P-03 | El Zonal Cache tiene el puerto y el origen (`httpbin.org`) quemados en el código, lo que el enunciado prohíbe | T-09, T-12 | Rafael Araya | Leerlos de variables de entorno y obtener el origen de la configuración del dominio (T-11) |
| P-04 | El DNS Interceptor carga los dominios y las IPs de las cachés de forma provisional en el código | T-18, T-19 | Otto Segura | Obtener los dominios de `GET /api/internal/domains` y las IPs por variables de entorno |
| P-05 | El proyecto de Firebase y la vinculación del API con Vercel aún no están creados | T-26 | Luis Delgado | Crearlos al inicio de la próxima semana para habilitar T-27 en adelante |

---

## 6. Resumen de participación individual

| Integrante               | Tareas asignadas | Commits | PRs | Resumen del trabajo realizado |
| ------------------------ | ---------------: | ------: | --: | ----------------------------- |
| Isaac Rojas Robles       |                8 |       0 |   0 | No registró avance en el repositorio durante esta semana |
| Rafael Araya             |                8 |       1 |   1 | Servidor HTTP concurrente del Zonal Cache con parseo de peticiones, validación preliminar de API key y reenvío al origen |
| Otto Segura              |                8 |       2 |   1 | Servidor UDP del DNS Interceptor, parser de peticiones, filtrado de dominios registrados y respuesta con la IP de la caché |
| Luis Diego Delgado Muñoz |                8 |       3 |   1 | Modelo de datos en Firestore, contrato del API con las cachés y el DNS Interceptor, estructura base del API con pruebas, y este reporte |
| Alexandra De Gracia      |                8 |       4 |   1 | Estructura base de la UI con React, Vite y Tailwind, y archivos de despliegue (Dockerfile, Docker Compose, Vercel) |

Las tareas transversales T-41 a T-45 no se contabilizan en la columna de tareas asignadas.

---

## 7. Plan para la siguiente semana

| ID           | Tarea / Actividad | Responsable(s) | Resultado esperado |
| ------------ | ----------------- | -------------- | ------------------ |
| T-01 a T-03  | Publicar `cache.h` e iniciar el almacenamiento en disco y el índice | Isaac Rojas | Interfaz acordada con Rafael Araya y motor básico operativo |
| T-10, T-11, T-13 | Matching con wildcards, lectura de configuración y validación de API key contra el API | Rafael Araya | Caché consumiendo la configuración real desde el REST API en Node.js |
| T-18, T-19   | Dominios desde el API e integración de la base IP to Country | Otto Segura | Interceptor eligiendo la caché por el país real del cliente |
| T-26, T-27, T-28 | Firebase y Vercel en funcionamiento, endpoints de usuarios y dominios | Luis Delgado | API desplegada en Vercel con registro de cuenta y de dominio con verificación TXT |
| T-31         | Implementar los endpoints internos contra Firestore | Luis Delgado | Endpoints del contrato respondiendo con datos reales |
| T-33, T-34   | Mover la UI a su carpeta, desplegarla en Vercel e iniciar el registro | Alexandra De Gracia | UI desplegada y formulario de registro de cuenta y dominio |

---

## 8. Observaciones

- Se publicó en el repositorio el modelo de datos (`docs/modelo-datos.md`) y el contrato de
  endpoints entre el REST API en Node.js, el Zonal Cache y el DNS Interceptor
  (`docs/contrato-cache-api.md`). Estos documentos desbloquean T-11, T-13, T-14, T-15 y T-18.
- Se eligió Firestore en lugar de Realtime Database, porque el modelo es jerárquico
  (dominio, URL, usuarios) y se expresa mejor con colecciones y subcolecciones.
- Sobre la UI (T-33):
  - **Interfaz de usuario:** React 18, Vite 5 y Tailwind CSS 3 quedaron integrados correctamente,
    con un diseño moderno y ordenado.
  - **Compilación y funcionamiento:** el proyecto compila en menos de cinco segundos. Se probaron el
    servidor local, la vista previa de producción, la navegación y la página 404.
  - **Docker y Nginx:** la imagen se construyó correctamente y las rutas están configuradas para
    funcionar al recargar las páginas.
  - **Bloqueo de PowerShell al ejecutar npm:** se resolvió usando `npm.cmd` y `cmd.exe /c` para
    ejecutar los comandos.
  - **Variable `VITE_API_BASE_URL`:** se añadió un aviso visual y control de errores para informar
    cuando falta la configuración del backend.
  - **Despliegue en Vercel:** la configuración está preparada en `vercel.json`; falta conectar el
    repositorio de GitHub desde la cuenta de Vercel y desplegar la aplicación.
