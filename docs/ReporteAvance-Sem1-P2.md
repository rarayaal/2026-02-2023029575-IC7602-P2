# Reporte Semanal de Avance – Proyecto 2

**Curso:** IC7602

**PROYECTO:** 2

**Semana:** 1

**Fecha del reporte:** 08/10/2026


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

Conforme a lo indicado en el enunciado, para el primer reporte se presenta únicamente la lista de
tareas planificadas, una breve descripción de cada una y la persona responsable.

### Zonal Cache: motor de caché y políticas de reemplazo · Isaac Rojas Robles

| ID   | Tarea                                | Descripción                                                                                           | Responsable(s) | Estado    | Avance |
| ---- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- | -------------- | --------- | -----: |
| T-01 | Interfaz pública del motor de caché  | Definir `cache.h` con los tipos y las firmas que constituyen el contrato con el servidor HTTP, desacoplado para permitir pruebas aisladas | Isaac Rojas | Pendiente | 0% |
| T-02 | Almacenamiento en disco              | Implementar la estructura de directorios y las operaciones de escritura y lectura de los objetos cacheados | Isaac Rojas | Pendiente | 0% |
| T-03 | Índice de entradas en memoria        | Mantener la clave dominio más URL, el tamaño, el TTL y los contadores de acceso de cada entrada        | Isaac Rojas    | Pendiente | 0% |
| T-04 | Expiración por TTL                   | Invalidar las entradas vencidas según el TTL definido para cada tipo de archivo                        | Isaac Rojas    | Pendiente | 0% |
| T-05 | Límite de tamaño por dominio         | Hacer cumplir el tamaño máximo de caché por dominio definido en la configuración                       | Isaac Rojas    | Pendiente | 0% |
| T-06 | Políticas LRU y MRU                  | Implementar los algoritmos de reemplazo Least Recently Used y Most Recently Used                       | Isaac Rojas    | Pendiente | 0% |
| T-07 | Políticas LFU, FIFO y Random         | Implementar los algoritmos de reemplazo Least Frequently Used, First-In First-Out y Random             | Isaac Rojas    | Pendiente | 0% |
| T-08 | Pruebas unitarias del motor          | Validar el comportamiento de cada política de reemplazo y del control de tamaño, de forma aislada del servidor | Isaac Rojas | Pendiente | 0% |

### Zonal Cache: servidor HTTP, seguridad y origen · Rafael Araya

| ID   | Tarea                                | Descripción                                                                                           | Responsable(s) | Estado    | Avance |
| ---- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- | -------------- | --------- | -----: |
| T-09 | Servidor HTTP concurrente            | Implementar en GNU C el servidor capaz de atender múltiples peticiones HTTP simultáneas                | Rafael Araya   | Pendiente | 0% |
| T-10 | Parseo de peticiones y matching      | Interpretar la petición HTTP y asociar la URL solicitada con su configuración, con soporte de wildcards | Rafael Araya  | Pendiente | 0% |
| T-11 | Lectura de la configuración          | Obtener desde Firebase la configuración del dominio: tamaño de caché, tipos de archivo, TTL y política de reemplazo | Rafael Araya | Pendiente | 0% |
| T-12 | Obtención del recurso desde el origen| Solicitar al origen el recurso ausente en caché, almacenarlo y servirlo al cliente                     | Rafael Araya   | Pendiente | 0% |
| T-13 | Autenticación por `x-api-key`        | Validar las peticiones HTTP mediante el encabezado de API key                                          | Rafael Araya   | Pendiente | 0% |
| T-14 | Autenticación por usuario y contraseña | Redirigir al formulario de autenticación de la UI y procesar el resultado de la validación           | Rafael Araya   | Pendiente | 0% |
| T-15 | Verificación de sesión               | Comprobar la sesión enviada en las peticiones posteriores a la autenticación                           | Rafael Araya   | Pendiente | 0% |
| T-16 | SSL termination y automatización     | Manejar la terminación SSL cuando sea necesaria, y construir el Dockerfile y el Helm Chart del Zonal Cache | Rafael Araya | Pendiente | 0% |

### DNS Interceptor, Rest API en Java y Apache Server · Otto Segura

| ID   | Tarea                                | Descripción                                                                                           | Responsable(s) | Estado    | Avance |
| ---- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- | -------------- | --------- | -----: |
| T-17 | Adaptación del DNS Interceptor       | Tomar el componente desarrollado en el Proyecto 1 y adaptarlo al flujo de redirección hacia cachés zonales | Otto Segura | Pendiente | 0% |
| T-18 | Interceptación de dominios           | Interceptar únicamente las peticiones dirigidas a los dominios registrados en la configuración         | Otto Segura    | Pendiente | 0% |
| T-19 | Selección de caché zonal por país    | Determinar la procedencia de la petición mediante la base de datos IP to Country y elegir la caché correspondiente | Otto Segura | Pendiente | 0% |
| T-20 | Construcción de la respuesta DNS     | Responder al cliente apuntando a la caché zonal seleccionada, conforme al RFC 2929                     | Otto Segura    | Pendiente | 0% |
| T-21 | Automatización del DNS Interceptor   | Construir el Dockerfile y el Helm Chart del componente                                                 | Otto Segura    | Pendiente | 0% |
| T-22 | Rest API en Java                     | Implementar el API con endpoints que cubran los verbos HTTP GET, POST, PUT y DELETE                    | Otto Segura    | Pendiente | 0% |
| T-23 | Automatización del Rest API en Java  | Construir el Dockerfile y el Helm Chart del componente                                                 | Otto Segura    | Pendiente | 0% |
| T-24 | Apache Server                        | Desplegar el servidor sirviendo una página HTML básica, con su respectivo Helm Chart                   | Otto Segura    | Pendiente | 0% |

### REST API en Node.js y modelo de datos · Luis Diego Delgado Muñoz

| ID   | Tarea                                | Descripción                                                                                           | Responsable(s) | Estado    | Avance |
| ---- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- | -------------- | --------- | -----: |
| T-25 | Modelo de datos en Firebase/Firestore| Diseñar las colecciones de usuarios, dominios, URLs, configuración de caché, API keys y sesiones, y acordarlo con el resto del equipo | Luis Delgado | Pendiente | 0% |
| T-26 | Estructura base del API              | Configurar el proyecto en Node.js y su despliegue automático en Vercel desde GitHub                    | Luis Delgado   | Pendiente | 0% |
| T-27 | Endpoints de usuarios                | Registro, autenticación y administración de las personas usuarias                                      | Luis Delgado   | Pendiente | 0% |
| T-28 | Endpoints de dominios                | Alta y baja de dominios, y verificación de propiedad mediante registro TXT                             | Luis Delgado   | Pendiente | 0% |
| T-29 | Endpoints de URLs y caché            | Administración de URLs con wildcards y de su configuración de caché por tipo de archivo, TTL y política de reemplazo | Luis Delgado | Pendiente | 0% |
| T-30 | Endpoints de API keys y sesiones     | Creación y eliminación de API keys, y emisión y validación de sesiones                                 | Luis Delgado   | Pendiente | 0% |
| T-31 | Endpoints de consulta para las cachés| Exponer a las cachés zonales la configuración del dominio y la validación de credenciales y sesiones   | Luis Delgado   | Pendiente | 0% |
| T-32 | Mecanismo de seguridad del API       | Investigar, implementar y documentar el mecanismo de autenticación y autorización del API, según exige el enunciado | Luis Delgado | Pendiente | 0% |

### UI y orquestación global · Alexandra De Gracia

| ID   | Tarea                                | Descripción                                                                                           | Responsable(s) | Estado    | Avance |
| ---- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- | -------------- | --------- | -----: |
| T-33 | Estructura base de la UI             | Configurar la aplicación en React, Vite y Tailwind CSS, con despliegue automático en Vercel desde GitHub | Alexandra De Gracia | Pendiente | 0% |
| T-34 | Registro de cuenta y dominio         | Permitir crear una cuenta y registrar un dominio, validándolo mediante un registro TXT                 | Alexandra De Gracia | Pendiente | 0% |
| T-35 | Administración de dominios           | Agregar y eliminar dominios, verificando la propiedad al agregarlos                                    | Alexandra De Gracia | Pendiente | 0% |
| T-36 | Administración de URLs               | Crear, eliminar y modificar URLs dentro de un dominio, con soporte de wildcards                        | Alexandra De Gracia | Pendiente | 0% |
| T-37 | Configuración de caché por URL       | Definir el tamaño de caché, y por tipo de archivo el TTL y la política de reemplazo                    | Alexandra De Gracia | Pendiente | 0% |
| T-38 | Configuración de autenticación       | Administrar el mecanismo de cada URL: creación y eliminación de API keys, y de usuarios y contraseñas  | Alexandra De Gracia | Pendiente | 0% |
| T-39 | Formulario de autenticación y sesión | Proveer el formulario que utilizan las cachés zonales y la funcionalidad de cerrar sesión              | Alexandra De Gracia | Pendiente | 0% |
| T-40 | Orquestación global del stack        | Integrar los componentes mediante Docker Compose y el despliegue conjunto de los Helm Charts           | Alexandra De Gracia | Pendiente | 0% |

### Tareas transversales · Todo el grupo

| ID   | Tarea                                | Descripción                                                                                           | Responsable(s) | Estado    | Avance |
| ---- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- | -------------- | --------- | -----: |
| T-41 | Documentación técnica por componente | Cada integrante redacta las instrucciones de ejecución, los diagramas y los casos de prueba reproducibles de su propio componente | Los 5 | Pendiente | 0% |
| T-42 | Conclusiones y recomendaciones       | Cada integrante aporta dos conclusiones y dos recomendaciones, para completar las diez de cada tipo que exige la rúbrica | Los 5 | Pendiente | 0% |
| T-43 | Tabla de funcionalidades             | Elaborar la tabla de qué funciona y qué no, con los cuatro bloques requeridos: DNS Interceptor, Zonal Cache, RestAPI Node.js y UI, y Rest API y Apache Server | Los 5 | Pendiente | 0% |
| T-44 | Pruebas de extremo a extremo         | Validar el sistema completo con los cuatro orígenes exigidos: el Rest API, el servidor Apache, un sitio externo con HTTP y un sitio externo con HTTPS | Los 5 | Pendiente | 0% |
| T-45 | Reportes de avance                   | Elaborar y enviar el reporte semanal conforme al formato establecido                                   | Luis Delgado   | En progreso | 100% |

**Estados permitidos:** Pendiente / En progreso / Bloqueada / Finalizada.

---

## 3. Commits realizados

Al tratarse del primer reporte de avance, no se registran commits durante este período. El
repositorio se encuentra en configuración inicial.

---

## 4. Pull Requests (PRs)

Ningún integrante del grupo creó Pull Requests durante este período.

---

## 5. Problemas

No se presentaron problemas o bloqueos durante esta semana.

---

## 6. Resumen de participación individual

| Integrante               | Tareas asignadas | Commits | PRs | Resumen del trabajo realizado                                                           |
| ------------------------ | ---------------: | ------: | --: | ---------------------------------------------------------------------------------------- |
| Isaac Rojas Robles       |                8 |       0 |   0 | Participó en la planificación y asumió el motor de caché y las políticas de reemplazo     |
| Rafael Araya             |                8 |       0 |   0 | Participó en la planificación y asumió el servidor HTTP, la seguridad y la obtención desde el origen |
| Otto Segura              |                8 |       0 |   0 | Participó en la planificación y asumió el DNS Interceptor, el Rest API en Java y el Apache Server |
| Luis Diego Delgado Muñoz |                8 |       0 |   0 | Participó en la planificación, asumió el REST API en Node.js y el modelo de datos, y elaboró este reporte |
| Alexandra De Gracia      |                8 |       0 |   0 | Participó en la planificación y asumió la UI y la orquestación global del stack           |

Las tareas transversales T-41 a T-45 son responsabilidad compartida de los cinco integrantes y no se
contabilizan en la columna anterior.

---

## 7. Plan para la siguiente semana

| ID           | Tarea / Actividad                                      | Responsable(s)      | Resultado esperado                                                                |
| ------------ | ------------------------------------------------------ | ------------------- | --------------------------------------------------------------------------------- |
| T-25         | Cerrar el modelo de datos en Firebase/Firestore        | Luis Delgado        | Colecciones definidas, documentadas y publicadas en el repositorio para todo el equipo |
| T-01         | Publicar la interfaz pública del motor de caché        | Isaac Rojas         | `cache.h` acordado con el responsable del servidor HTTP e integrado a `main`       |
| T-02, T-03   | Iniciar el motor de caché                              | Isaac Rojas         | Almacenamiento en disco e índice de entradas operativos                            |
| T-09, T-10   | Iniciar el servidor HTTP del Zonal Cache               | Rafael Araya        | Servidor atendiendo peticiones concurrentes y resolviendo la URL solicitada        |
| T-17, T-18   | Adaptar el DNS Interceptor del Proyecto 1              | Otto Segura         | Interceptor desplegado e interceptando los dominios registrados                    |
| T-26, T-27   | Levantar el REST API en Node.js                        | Luis Delgado        | API desplegada en Vercel con los endpoints de usuarios funcionando                 |
| T-33, T-34   | Levantar la UI                                         | Alexandra De Gracia | Aplicación desplegada en Vercel con el registro de cuenta y de dominio             |

---

## 8. Observaciones

- Los componentes que se ejecutan en Vercel, es decir el REST API en Node.js y la UI, no requieren
  Helm Charts propios. Por esa razón sus responsables asumieron cargas complementarias: el modelo de
  datos en un caso y la orquestación global del stack en el otro.
- El modelo de datos en Firebase/Firestore constituye la dependencia transversal del proyecto, ya que
  el Zonal Cache lo consulta, la UI escribe sobre él y el REST API en Node.js actúa como
  intermediario. Por ello se priorizó para la primera semana de trabajo.
- Respecto al acceso a la configuración desde el Zonal Cache, el grupo acordó que la consulta se
  realice a través del REST API en Node.js y no directamente contra Firebase, dado que el enunciado
  establece que dicho API implementa los endpoints requeridos tanto por la UI como por las cachés
  zonales. Esta decisión evita incorporar la autenticación de Google dentro del componente escrito en
  GNU C.
- La terminación SSL se evaluará a nivel del Ingress de Kubernetes antes que implementarla dentro del
  componente en GNU C. Para las peticiones hacia orígenes con HTTPS se contempla el uso de una
  biblioteca cliente establecida.
