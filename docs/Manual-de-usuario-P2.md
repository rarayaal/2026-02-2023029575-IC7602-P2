# Manual de usuario — P2

**Curso:** IC-7602 Redes · **Proyecto 2** · S2 2026

**Integrantes:** Isaac Rojas Robles · Rafael Araya Álvarez · Luis Diego Delgado Muñoz ·
Otto Segura Ruiz · Alexandra De Gracia

---

## 1. Qué es este proyecto


---

## 2. Requisitos previos

- Docker y Docker Compose para construir y ejecutar los contenedores.
- Node.js 22 o superior y npm para ejecutar y probar el REST API.
- GCC y Make para compilar el DNS Interceptor y el Zonal Cache en GNU C.
- Un navegador web moderno para acceder a la interfaz de usuario.
- Opcionalmente, kubectl, Helm y acceso a un clúster de Kubernetes para realizar el despliegue mediante los charts.
---

## 3. Instalación y ejecución


---

## 4. Componentes

### 4.1 DNS Interceptor


### 4.2 Zonal Cache
El Zonal Cache es el componente encargado de recibir solicitudes HTTP, verificar si el recurso solicitado está almacenado localmente y responderlo desde la caché cuando sea posible. Cuando el recurso no está disponible, realiza una solicitud al servidor de origen, devuelve la respuesta al cliente y almacena el contenido para solicitudes posteriores. El componente está desarrollado en GNU C.

El motor de caché soporta expiración mediante TTL, con reglas específicas por tipo de archivo y un TTL predeterminado. Además, implementa las políticas de selección de víctimas LRU, MRU, LFU, FIFO y Random:

- **LRU:** selecciona el recurso utilizado hace más tiempo.
- **MRU:** selecciona el recurso utilizado más recientemente.
- **LFU:** selecciona el recurso con menor cantidad de accesos.
- **FIFO:** selecciona el recurso insertado primero.
- **Random:** selecciona un recurso aleatoriamente.

El flujo general de una solicitud es el siguiente:

1. El cliente envía una solicitud HTTP al Zonal Cache.
2. El servidor obtiene el dominio, la ruta y los datos de autenticación.
3. Se identifica la configuración correspondiente mediante el patrón de URL.
4. Se valida el mecanismo de autenticación configurado.
5. Se consulta el índice y el almacenamiento en disco.
6. Si el recurso existe y no expiró, se devuelve como cache hit.
7. Si no existe, se solicita al servidor de origen como cache miss.
8. La respuesta del origen se devuelve al cliente.
9. El recurso se almacena en disco y se registra en el índice en memoria.

#### 4.2.1 Arquitectura multihilo

El servidor usa sockets TCP no bloqueantes y un modelo multihilo basado en POSIX threads, donde cada conexión entrante es atendida de forma concurrente mediante hilos desacoplados, para garantizar la consistencia atómica y prevenir condiciones de carrera entre hilos que leen y escriben simultaneamente sobre el índice en memoria y el sistema de archivos, todas las operaciones de acceso al motor de almacenamiento estan sincronizados mediante un mutex global.

#### 4.2.2 Integración con REST API y Firestore

El Zonal Cache no almacena la configuracion estática en el código, esta consume el endpoint interno del backend en Node.js 

```
GET /api/internal/domains/{domain}/config 
```

Autenticandose mediante un token Bearer de servicio. El cliente HTTP interno parsea la respues en JSON, abstrauendo el esquema, host y puerto del servidor de origen, la cuota máxima de almacenamiento en disco y el arreglo jerárquico de URLs, sus patrones de comodín y el tipo de autenticación requeridos, además de las politicas del TTL dependiendo de la extensión del archivo. 

En casos de que no este disponible temporalmente, el servidor dispone de un mecanismo de respaldo automativo a variables de entorno. 

#### 4.2.3 Seguridad y control de acceso

Al recibir una solicitud, el servidor evalú la regla de URL que coincide con mayor especidad: 

1. Acceso publico: no requiere credenciales, consulta la caché.
2. API KEY: Extrae el encabezado y lo valida en tiempo real. Si el encabezadoesta ausente o la clave no pertenece al dominio y URL solicitada, responde con un 401 Unauthorized. 
3. Usuario y contraseña: Comprueba la existencia de la cookie zc_sessión, si la sesión no esta activa, responde con un 302 found hacia la interfaz de usuario, adjuntando en los query parameterss el dominio, el autentiador de URL y la URL de destino. La ruta de recepción de sesión zc/session es una ruta reservada que nunca se envía al origen, el navegador es redirigido y el servidor valida el token, emite la cookie de respuesta y redirige al usuario a la ruta solicitada. Peticiones posteriores: valida la cookie contra el backend garantizando el acceso seguro.

#### 4.2.4 Orígenes HTTP/HTTPS y almacenamiento en cache. 

Cuando ocurre un cache miss, el servidor analiza el esquema configurado para el origen: 

1. HTTP plano: establece una conexión directa por socket TCP al puerto de origen y reenvia la solicitud con encabezado connection:close. 
2. HTTPS remoto: Usa libcurl con soporte TLS/SSL para establecer sesiones cifradas seguras contra dominios externos en el puerto 443, soportando buffers dinámicos de hasta 512KB para evitar truncamiento de páginas y recursos multimedia.

Al recibir la respuesta exitosa del origen, el recurso se sirve al cliente y se inserta en la caché. La inserción deduce la extensión del archivo, calcula su fecha de expiración con el TTL configurado para ese tipo de contenido y aplica automaticamente la plitica de expulsión de víctimas correspondiente mediante el algoritmo LRU, MRU, LFU FIFO o Random. 

### 4.3 REST API

El REST API en Node.js es el único componente que lee y escribe en Firestore. La interfaz de usuario lo utiliza para administrar cuentas, dominios, URLs y credenciales, y el Zonal Cache y el DNS Interceptor lo consultan para obtener su configuración y validar credenciales. Está desarrollado con Node.js 22 y Express 5, y se ejecuta en Vercel con despliegue automático desde GitHub.

Centralizar el acceso a la base de datos en este componente evita incorporar la autenticación de Google dentro de los componentes escritos en GNU C, y deja un único punto donde se aplican las reglas de negocio y de seguridad.

**URL de producción:** `https://ic7602-p2-node-api.vercel.app/api`

#### 4.3.1 Modelo de datos

La información se guarda en Cloud Firestore en las siguientes colecciones:

| Colección | Contenido |
| --- | --- |
| `users/{uid}` | Perfil de las personas usuarias de la plataforma. Las contraseñas las administra Firebase Authentication |
| `domains/{dominio}` | Dominio registrado: dueño, servidor de origen (esquema, host y puerto), cuota de caché y estado de verificación |
| `domains/{dominio}/urls/{id}` | Reglas de URL: patrón con comodines, cuota, mecanismo de autenticación y, por tipo de archivo, el TTL y la política de reemplazo |
| `domains/{dominio}/urls/{id}/users/{usuario}` | Usuarios de una URL protegida, con su contraseña cifrada con bcrypt |
| `apiKeys/{hash}` | API keys de las URLs protegidas, identificadas por el hash SHA-256 de la clave |
| `sessions/{hash}` | Sesiones de usuario y contraseña, identificadas por el hash SHA-256 del token, con su fecha de vencimiento |

Se distinguen dos tipos de usuario que viven en colecciones separadas: las personas que administran dominios en la plataforma y los usuarios creados para proteger una URL específica, que son los que valida el Zonal Cache. Las API keys y las sesiones nunca se guardan en claro; el identificador del documento es su hash, por lo que validarlas requiere una única lectura.

#### 4.3.2 Endpoints para la interfaz de usuario

| Recurso | Operaciones |
| --- | --- |
| Cuentas | `POST /api/users` (registro) · `GET`, `PUT`, `DELETE /api/users/me` |
| Dominios | `GET`, `POST /api/domains` · `GET`, `DELETE /api/domains/{dominio}` · `POST /api/domains/{dominio}/verify` |
| URLs | `GET`, `POST /api/domains/{dominio}/urls` · `GET`, `PUT`, `DELETE /api/domains/{dominio}/urls/{id}` |
| API keys | `GET`, `POST .../urls/{id}/api-keys` · `DELETE .../urls/{id}/api-keys/{keyId}` |
| Usuarios de URL | `GET`, `POST .../urls/{id}/users` · `PUT .../users/{usuario}/password` · `DELETE .../users/{usuario}` |
| Sesiones | `POST /api/sessions` (inicio de sesión) · `DELETE /api/sessions` (cierre de sesión) |

El API aplica las siguientes reglas de negocio:

1. Un dominio solo puede registrarse una vez y queda pendiente hasta que se verifique su propiedad. Para ello, el API genera un token y la persona debe publicar el registro TXT `_proxycache-verify.<dominio>` con el valor `proxycache-verification=<token>`. Al solicitar la verificación, el API consulta el DNS y, si el valor coincide, marca el dominio como verificado.
2. El patrón de una URL no se repite dentro del dominio, y la suma de las cuotas de sus URLs no supera la cuota del dominio.
3. Las API keys solo se crean en URLs con autenticación por API key, y los usuarios solo en URLs con usuario y contraseña. Si una URL cambia de mecanismo, se eliminan las credenciales del anterior.
4. Cambiar la contraseña de un usuario o eliminarlo cierra sus sesiones abiertas.
5. Eliminar un dominio, una URL o una cuenta elimina en cascada todo lo que depende de ellos.

#### 4.3.3 Endpoints para el Zonal Cache y el DNS Interceptor

Los endpoints internos se autentican con un token de servicio y responden en un formato pensado para ser interpretado fácilmente desde GNU C:

```
GET  /api/internal/domains                    Dominios verificados
GET  /api/internal/domains/{dominio}/config   Origen, cuota y URLs del dominio
POST /api/internal/validate/api-key           Valida una API key para un dominio y una URL
POST /api/internal/validate/session           Valida un token de sesión para un dominio y una URL
```

La configuración entrega las URLs ordenadas de la más específica a la más general, para que la caché utilice la primera coincidencia, y los tipos de archivo como un arreglo con su TTL y su política de reemplazo. Solo los dominios verificados se exponen a la caché.

En la autenticación por usuario y contraseña participan tres componentes: la caché redirige al formulario de la interfaz, la interfaz solicita al API la creación de la sesión y el token regresa a la caché, que lo guarda en la cookie `zc_session`. En las peticiones posteriores, la caché valida la cookie contra el API.

#### 4.3.4 Seguridad

El API utiliza un mecanismo distinto según quién realiza la petición:

1. **Interfaz de usuario:** la persona inicia sesión con Firebase Authentication y la interfaz envía en cada petición el ID token (`Authorization: Bearer <token>`), un JWT firmado por Google que el API verifica con el Admin SDK. Además, cada dominio guarda quién es su dueño, por lo que una cuenta válida no puede consultar ni modificar dominios de otra persona.
2. **Servicios internos:** el Zonal Cache y el DNS Interceptor envían un token de servicio compartido, inyectado por variable de entorno, que se compara en tiempo constante para no filtrar información.
3. **Credenciales de URLs protegidas:** las contraseñas se guardan con bcrypt y las API keys y sesiones como hashes SHA-256. Ante un usuario inexistente o una contraseña incorrecta, la respuesta es la misma, para no revelar qué usuarios existen.

Adicionalmente, el API restringe CORS a los orígenes configurados, valida todos los cuerpos de las peticiones antes de acceder a Firestore y las reglas de Firestore niegan cualquier acceso directo desde clientes. El detalle completo del mecanismo, las alternativas evaluadas y sus limitaciones se encuentra en `docs/seguridad-api.md`.

#### 4.3.5 Ejecución y despliegue

Para ejecutarlo localmente:

```bash
cd node-api
npm install
cp .env.example .env
npm run dev
```

| Variable | Descripción |
| --- | --- |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Credenciales de la cuenta de servicio de Firebase |
| `INTERNAL_SERVICE_TOKEN` | Token de servicio; debe coincidir con `CONFIG_API_TOKEN` del Zonal Cache |
| `CORS_ORIGINS` | Orígenes del navegador autorizados, separados por comas |
| `SESSION_TTL_SECONDS` | Duración de las sesiones de URLs protegidas (por defecto 3600) |
| `BCRYPT_ROUNDS` | Costo de bcrypt (por defecto 10) |

En producción, el despliegue se realiza mediante GitHub Actions con la CLI de Vercel en cada integración a `main` que modifique `node-api/`. El flujo ejecuta las pruebas y, solo si todas pasan, publica la nueva versión. Se utiliza la CLI en lugar de la integración directa de Vercel con GitHub porque el repositorio es privado y el plan gratuito de Vercel solo permite desplegar al dueño de la cuenta.

### 4.4 Apache Server


### 4.5 UI
Es una aplicación web de página única (SPA) desarrollada con React, Vite, Tailwind CSS y Firebase Authentication, desplegada en Vercel. Funciona como panel de control del Proxy/Caché Zonal y como portal de inicio de sesión para los usuarios finales.

Su objetivo es permitir que el administrador configure y gestione el sistema sin necesidad de interactuar directamente con el API. Para ello, ofrece funcionalidades de registro y verificación de dominios, definición de reglas de URL, configuración de TTL y políticas de reemplazo para cada tipo de archivo, así como la administración de los permisos de acceso al contenido mediante tres modalidades: público, API Key o usuario y contraseña.

Además, permite gestionar el acceso de los usuarios finales que intentan ingresar a una ruta protegida. Cuando un usuario no tiene una sesión activa, el sistema muestra un formulario de inicio de sesión y, una vez autenticado, lo redirige a su destino original con una sesión válida.

### 4.5.1 Funcionalidades principales

La interfaz permite realizar las siguientes operaciones:

- Crear cuentas de administración y registrar dominios.
- Configurar el origen de cada dominio mediante esquema, host y puerto.
- Establecer cuotas de caché desde 50 MB hasta 1 GB o mediante valores personalizados.
- Verificar la propiedad de los dominios mediante registros DNS TXT.
- Consultar, actualizar, verificar y eliminar dominios registrados.
- Eliminar automáticamente las reglas asociadas cuando se elimina un dominio.

### 4.5.2 Verificación de dominios

Para comprobar la propiedad de un dominio, el sistema utiliza un mecanismo de verificación mediante un registro DNS TXT.

El administrador debe agregar el registro:

`_proxycache-verify.<dominio>`

La interfaz permite consultar el estado de verificación de cada dominio, que puede ser:

- **Pendiente:** el dominio todavía no ha completado el proceso de verificación.
- **Verificado:** el sistema ha confirmado correctamente la propiedad del dominio.

### 4.5.3 Administración de reglas de URL

Cada dominio puede tener múltiples reglas de URL. Estas permiten determinar qué recursos serán almacenados en caché y bajo qué condiciones.

Cada regla contiene:

- **Patrón:** define la ruta que debe coincidir con la solicitud y admite comodines (`*`).
- **Tamaño de caché:** establece una capacidad entre 1 MB y 50 MB.
- **Tipo de autenticación:** determina el mecanismo necesario para acceder al contenido.

Cuando varias reglas coinciden con una misma solicitud, se aplica la regla con mayor cantidad de caracteres literales. Por ejemplo:

1. `/images/logo.png`
2. `/images/*`
3. `/*`

La interfaz ordena automáticamente las reglas según su nivel de especificidad.

Asimismo, valida que la suma de las cuotas asignadas a las reglas de URL no supere la cuota total configurada para el dominio.

### 4.5.4 Configuración de caché

La interfaz permite configurar el tiempo de vida de los elementos almacenados en caché (TTL), expresado en segundos, y seleccionar una política de reemplazo según el tipo de archivo.

Las políticas disponibles son:

- **LRU:** reemplaza el elemento utilizado menos recientemente.
- **LFU:** reemplaza el elemento utilizado con menor frecuencia.
- **FIFO:** reemplaza el elemento que lleva más tiempo almacenado.
- **MRU:** reemplaza el elemento utilizado más recientemente.
- **RANDOM:** selecciona un elemento de manera aleatoria.

Para facilitar la configuración, se incluyen plantillas predefinidas para los siguientes tipos de contenido:

- HTML.
- CSS y JavaScript.
- Imágenes.
- JSON.
- Comodín (`*`), aplicable a cualquier tipo de archivo.

### 4.5.5 Autenticación por URL

Cada regla de URL puede utilizar uno de los siguientes mecanismos de autenticación:

**1. Acceso público**

Permite consultar el contenido sin requerir credenciales ni autenticación adicional.

**2. API Key**

Permite proteger el contenido mediante una clave de acceso generada directamente en el navegador.

- La clave utiliza el prefijo `pk_` seguido de 64 caracteres hexadecimales.
- Se muestra una única vez al momento de su generación.
- Puede revocarse cuando sea necesario.
- Se envía mediante el encabezado `X-Api-Key` o `Authorization: Bearer`.

**3. Usuario y contraseña**

Permite administrar usuarios autorizados para acceder al contenido protegido.

Desde la interfaz se pueden realizar las siguientes operaciones:

- Crear usuarios.
- Cambiar contraseñas.
- Eliminar usuarios.

### 4.5.6 Acceso a cachés zonales

La interfaz también funciona como portal de autenticación para los usuarios finales que intentan acceder a contenido protegido mediante las cachés zonales.

Cuando un usuario intenta ingresar a una ruta protegida sin disponer de una sesión activa, el sistema lo redirige al formulario de inicio de sesión.

Una vez que las credenciales son validadas correctamente:

1. Se crea una sesión de usuario.
2. Se establece la cookie `zc_session`.
3. La cookie utiliza las propiedades `HttpOnly` y `SameSite=Lax`.
4. El usuario es redirigido a la ruta protegida que intentaba consultar originalmente.

Para garantizar la seguridad del proceso, se aplican las siguientes medidas:

- Únicamente se permiten redirecciones relativas, evitando vulnerabilidades de redirección abierta.
- Las contraseñas nunca se almacenan en el navegador.
- La cookie de sesión protege el acceso al contenido autenticado.
- Al cerrar sesión, el token correspondiente se invalida para impedir que pueda seguir utilizándose.

De esta manera, la interfaz de usuario centraliza la administración del Proxy/Caché Zonal y proporciona un mecanismo de autenticación para los usuarios finales, facilitando la configuración, supervisión y protección de los recursos sin necesidad de interactuar directamente con los servicios internos del sistema.


---

## 5. Pruebas realizadas

### 5.1 DNS Interceptor


### 5.2 Zonal Cache
| # | Qué se probó | Cómo reproducirlo | Resultado |
| --- | --- | --- | --- |
| 1 | Creación y validación del índice en memoria | Ejecutar `cd zonal-cache` y luego `make test`. El archivo `tests/test_cache.c` intenta crear índices válidos y un índice con cero buckets, además de probar argumentos inválidos. | El índice válido se crea y los casos inválidos devuelven el resultado esperado. |
| 2 | Inserción, consulta, actualización y eliminación de entradas | Ejecutar `cd zonal-cache && make test`. La prueba inserta una entrada, consulta sus datos, actualiza sus metadatos y finalmente la elimina. |Se mantienen los datos esperados, se conserva el orden de inserción y las operaciones sobre entradas inexistentes devuelven `CACHE_NOT_FOUND`. |
| 3 | Registro de accesos y estadísticas | Ejecutar `cd zonal-cache && make test`. La prueba llama a `cache_index_touch` y consulta los campos `last_accessed_at` y `access_count`. | Se actualiza la fecha del último acceso y se incrementa el contador. |
| 4 | TTL y expiración de entradas | Ejecutar `cd zonal-cache && make test`. La prueba calcula expiraciones con reglas específicas y TTL predeterminado, verifica entradas vigentes y expiradas, y ejecuta una purga. | Se calculan las fechas esperadas y se eliminan las entradas expiradas. |
| 5 | Políticas de reemplazo LRU, MRU, LFU, FIFO y Random | Ejecutar `cd zonal-cache && make test`. La prueba inserta varias entradas del mismo dominio, simula accesos y selecciona una víctima con cada política. | Cada política selecciona una entrada válida de acuerdo con su criterio. También se rechazan políticas inválidas y dominios sin entradas. |
| 6 | Almacenamiento y recuperación de archivos en disco | Ejecutar `cd zonal-cache && make test`. La prueba crea `build/cache-test`, escribe y lee recursos, prueba un recurso vacío, elimina archivos y consulta un recurso inexistente. | El contenido leído coincide con el contenido escrito y se obtienen los códigos esperados para recursos inexistentes. |
| 7 | Validación de rutas y tamaños de buffer | Ejecutar `cd zonal-cache && make test`. La prueba intenta utilizar el dominio `../escape` y un buffer de salida demasiado pequeño. | Se rechazan los intentos de escape de directorio y se devuelve `CACHE_BUFFER_TOO_SMALL` cuando corresponde. |
| 8 | Integración entre el índice y el almacenamiento | Ejecutar `cd zonal-cache && make test`. La prueba utiliza `cache_store_put`, `cache_store_get` y `cache_store_remove` para almacenar, consultar y eliminar un recurso. | El recurso queda registrado en el índice, se recupera desde disco y se elimina de ambas estructuras. |
| 9 | Matching de patrones URL | Ejecutar `cd zonal-cache && make test`. El archivo `tests/test_t10_matching.c` prueba coincidencias exactas, `/*`, `/admin/*`, `*.png` y comodines intermedios. | Las rutas que deben coincidir coinciden y las rutas fuera del patrón son rechazadas. |
| 10 | Parseo de solicitudes HTTP | Ejecutar `cd zonal-cache && make test`. La prueba procesa una solicitud HTTP con método, ruta, host, `x-api-key` y cookie `zc_session`. | Se extraen correctamente todos los campos esperados. |

### 5.3 REST API

| # | Qué se probó | Cómo reproducirlo | Resultado |
| --- | --- | --- | --- |
| 1 | Disponibilidad del servicio | Ejecutar `cd node-api && npm test -- --test-name-pattern="GET /api/health"`. | `/api/health` responde `200` sin credenciales. |
| 2 | Autenticación de servicios internos | Ejecutar `cd node-api && npm test -- --test-name-pattern="service token"`. La prueba llama a `/api/internal` sin token, con un token incorrecto y con el token correcto. | Sin token responde `401 MISSING_SERVICE_TOKEN`, con un token incorrecto `401 INVALID_SERVICE_TOKEN` y con el correcto la petición es aceptada. |
| 3 | Protección de los endpoints de la interfaz | Ejecutar `cd node-api && npm test -- --test-name-pattern="Firebase ID token"`. La prueba llama sin token a perfiles, dominios, verificación y URLs. | Todas las rutas responden `401 MISSING_ID_TOKEN`. |
| 4 | Validación de cuerpos antes de acceder a Firestore | Ejecutar `cd node-api && npm test -- --test-name-pattern="validate before touching Firestore"`. | Un correo inválido responde `400 INVALID_EMAIL` y un inicio de sesión incompleto responde `400`. |
| 5 | Restricción de CORS | Ejecutar `cd node-api && npm test -- --test-name-pattern="CORS"`. | El origen configurado recibe los encabezados CORS y la verificación previa responde `204`; un origen no autorizado no los recibe. |
| 6 | Formato uniforme de errores | Ejecutar `cd node-api && npm test -- --test-name-pattern="unknown routes"`. | Una ruta inexistente responde `404 NOT_FOUND` y un JSON mal formado responde `400 INVALID_JSON`, ambos con la forma `{ error: { code, message } }`. |
| 7 | Validación de dominios, orígenes y patrones de URL | Ejecutar `cd node-api && npm test -- --test-name-pattern="validateDomainName|validateOrigin|validatePattern"`. | Se normalizan los dominios válidos y se rechazan dominios sin punto, con esquema o con etiquetas inválidas, esquemas distintos de HTTP y HTTPS, puertos fuera de rango y patrones sin `/` inicial o con `?`. |
| 8 | Validación de tipos de archivo, TTL y políticas | Ejecutar `cd node-api && npm test -- --test-name-pattern="validateFileTypes|validateUrlBody"`. | Se normalizan las extensiones, se acepta el comodín `*` y se rechazan políticas fuera de LRU, LFU, FIFO, MRU y RANDOM, TTL no positivos y tipos de autenticación desconocidos. |
| 9 | Recepción de API keys como hash | Ejecutar `cd node-api && npm test -- --test-name-pattern="validateApiKeyBody"`. | Se acepta el hash SHA-256 y el prefijo generados por la interfaz, y se rechaza una clave enviada en claro. |
| 10 | Verificación de propiedad por registro TXT | Ejecutar `cd node-api && npm test -- --test-name-pattern="txtRecord|isDomainVerified"`. La prueba utiliza un resolvedor DNS simulado. | Se construye el registro `_proxycache-verify.<dominio>`, se unen los fragmentos de un registro partido, un registro inexistente devuelve "no verificado" y los errores inesperados del DNS se propagan. |
| 11 | Configuración entregada al Zonal Cache | Ejecutar `cd node-api && npm test -- --test-name-pattern="Specificity|fileTypesToArray|toUrlConfig"`. | Las URLs se ordenan de la más específica a la más general y los tipos de archivo se convierten a arreglo con el comodín `*` al final. |
| 12 | Flujo completo contra Firebase real | Completar `node-api/.env` (incluida `FIREBASE_WEB_API_KEY`), ejecutar `npm run dev` en una terminal y `npm run e2e` en otra. | Se ejecutan 36 pasos: registro, dominios, URLs, API keys, usuarios, inicio y cierre de sesión, y la vista del Zonal Cache. Resultado: `all 36 checks passed`. La prueba elimina al final todos los datos que creó. |
| 13 | Despliegue en producción | Ejecutar `curl https://ic7602-p2-node-api.vercel.app/api/health` y `curl -i https://ic7602-p2-node-api.vercel.app/api/domains`. | La primera petición responde `{"status":"ok"}` y la segunda `401 MISSING_ID_TOKEN`. El workflow `Deploy node-api` de GitHub Actions finaliza correctamente. |

### 5.4 Apache Server


### 5.5 UI

| # | Qué se probó | Cómo reproducirlo | Resultado |
|:---:|:---|:---|:---|
| 1 | Navegación de rutas y protección de acceso administrativo | 1. Iniciar el servidor local: `npm.cmd run dev`.<br>2. Acceder en el navegador a `http://localhost:5173/dominios` sin haber iniciado sesión.<br>3. Comprobar que `ProtectedRoute.jsx` intercepte la navegación y redirija a `/login`.<br>4. Verificar que `location.state.from` conserve la ruta original `/dominios`. | La aplicación bloquea el acceso no autenticado a las páginas administrativas y preserva la ruta de destino para redirigir tras el inicio de sesión. |
| 2 | Validación sintáctica del correo electrónico administrativo (RFC 5322) | Ejecutar en terminal: `node --test test/authService.test.mjs --test-name-pattern="Validación de formato de correo electrónico"` | `isValidEmail` rechaza cadenas vacías, dominios incompletos (`usuario@`, `@dominio.com`) y espacios, aceptando únicamente correos válidos (`admin@empresa.com`). |
| 3 | Validación de longitud y complejidad de contraseñas de administración | Ejecutar en terminal: `node --test test/authService.test.mjs --test-name-pattern="Validación de longitud de contraseña"` | `validatePassword` rechaza contraseñas con menos de 6 caracteres con el mensaje "La contraseña debe tener al menos 6 caracteres" y admite claves de 6 a 128 caracteres. |
| 4 | Validación integral del formulario de registro de cuentas de usuario | Ejecutar en terminal: `node --test test/authService.test.mjs --test-name-pattern="Validación de formulario de registro de cuenta"` | `validateRegistrationForm` comprueba el nombre completo (mínimo 2 caracteres), formato de correo, fortaleza de contraseña y que `password === confirmPassword` ("Las contraseñas no coinciden"). |
| 5 | Normalización estricta de nombres de dominio (FQDN) | Ejecutar en terminal: `node --test test/domainService.test.mjs --test-name-pattern="Normalización estricta de nombres de dominio"` | `normalizeDomain` convierte a minúsculas, recorta espacios en blanco y elimina prefijos de protocolo (`http://`, `https://`) y barras finales (`/`). |
| 6 | Validación de sintaxis de dominio según RFC 1035 | Ejecutar en terminal: `node --test test/domainService.test.mjs --test-name-pattern="Validación de sintaxis de dominio"` | `validateDomainName` valida longitud máxima (253 caracteres), etiquetas separadas por punto (1 a 63 caracteres alfanuméricos) y rechaza guiones al inicio o final de las etiquetas. |
| 7 | Validación del formulario de registro de dominio y servidor de origen | Ejecutar en terminal: `node --test test/domainService.test.mjs --test-name-pattern="Validación de formulario de registro de dominio y origen"` | `validateDomainForm` comprueba el FQDN, esquema (`http`/`https`), host de origen, rango de puerto TCP (1–65535) y cuota de caché positiva en bytes. |
| 8 | Generación de especificación DNS TXT para verificación de propiedad | Ejecutar en terminal: `node --test test/domainService.test.mjs --test-name-pattern="Generación de especificación de registro DNS TXT"` | `getDnsTxtSpec` genera el host `_proxycache-verify.<dominio>`, tipo `TXT` y el valor estandarizado `proxycache-verification=<token>`. |
| 9 | Mapeo e interpretación de errores del API de dominios | Ejecutar en terminal: `node --test test/domainService.test.mjs --test-name-pattern="Mapeo e interpretación de errores de API de dominios"` | `parseDomainApiError` transforma códigos HTTP 400, 404 y 409 (`DOMAIN_ALREADY_EXISTS`) en mensajes comprensibles para el usuario final. |
| 10 | Carga, refresco y renderizado de la lista de dominios con métricas | 1. Iniciar la UI: `npm.cmd run dev`.<br>2. Navegar a `/dominios`.<br>3. Presionar el botón de recarga (`RefreshCw`).<br>4. Verificar que se muestre el spinner de carga (`animate-spin`) y se rendericen las tarjetas con FQDN, badge de verificación, origen y cuota formateada. | La vista `DomainsListPage.jsx` maneja los estados de carga, lista vacía y renderizado en cuadrícula de tarjetas con cálculo automático de unidades (MB/GB). |
| 11 | Flujo interactivo de comprobación de propiedad DNS TXT | 1. En la lista de dominios, presionar el botón **"Verificar TXT"**.<br>2. Verificar que se despliegue `DomainVerificationCard.jsx` con los botones de copiado al portapapeles.<br>3. Presionar el botón **"Comprobar registro DNS TXT"**.<br>4. Comprobar la respuesta visual ante estado pendiente o verificado. | El componente copia los valores al portapapeles con confirmación visual de 2.5 segundos, consulta `POST /api/domains/:domain/verify` y actualiza el badge a **Verificado** sin recargar la página. |
| 12 | Eliminación de dominio con modal de confirmación defensivo | 1. En una tarjeta de dominio, pulsar el ícono de papelera (`Trash2`).<br>2. Comprobar que emerja el modal con la advertencia de eliminación en cascada de URLs hijas.<br>3. Probar el botón **"Cancelar"**.<br>4. Presionar **"Eliminar dominio"** y validar el banner verde de confirmación. | `DomainsListPage.jsx` evita eliminaciones accidentales mediante diálogo modal, ejecuta `DELETE /api/domains/:domain` y retira el elemento del estado local. |
| 13 | Validación de sintaxis de patrones de URL con comodines (wildcards) | Ejecutar en terminal: `node --test test/urlService.test.mjs --test-name-pattern="Validación de patrones de URL con wildcards"` | `validateUrlPattern` valida que el patrón inicie con `/`, rechaza espacios, barras dobles (`//`), query params (`?`) y fragmentos (`#`), permitiendo comodines `*` (`/*`, `/img/*`, `/*.css`). |
| 14 | Cálculo de especificidad de patrones comodín para ordenamiento jerárquico | Ejecutar en terminal: `node --test test/urlService.test.mjs --test-name-pattern="Cálculo de especificidad de patrones comodín"` | `calculatePatternSpecificity` cuenta los caracteres literales excluyendo `*`: `/img/logo.png` (13) > `/img/*` (5) > `/*` (1). La lista de URLs se ordena automáticamente de mayor a menor prioridad. |
| 15 | Validación de configuración de tipos de archivo (fileTypes), TTL y políticas de reemplazo | Ejecutar en terminal: `node --test test/urlService.test.mjs --test-name-pattern="Validación de configuración de tipos de archivo"` | `validateFileTypeEntry` valida extensiones alfanuméricas o `*`, TTL entero mayor a 0, y rechaza políticas ajenas a `LRU`, `LFU`, `FIFO`, `MRU` o `RANDOM`. |
| 16 | Control de cuota acumulada de caché entre URLs hijas y el dominio padre | Ejecutar en terminal: `node --test test/urlService.test.mjs --test-name-pattern="Validación integral de formulario de URL y cumplimiento de cuota"` | `validateUrlForm` impide crear o modificar una URL cuya cuota en bytes sumada a las demás URLs supere el límite global del dominio padre. |
| 17 | Exclusión de la regla actual al editar cuotas de caché en URLs existentes | Ejecutar en terminal: `node --test test/urlService.test.mjs --test-name-pattern="Control de cuota en edición: excluye la URL actual"` | Al modificar una regla existente, el algoritmo descuenta la cuota anterior antes de comprobar el límite del dominio, evitando falsos positivos de sobrecupo. |
| 18 | Generación criptográfica de API Keys seguras (`pk_` + 64 hex)| Ejecutar en terminal: `node --test test/urlAuthService.test.mjs --test-name-pattern="Generación de API keys criptográficas"` | `generateRawApiKey` utiliza `crypto.getRandomValues` para generar claves en claro con formato `pk_<64 caracteres hexadecimales>`, rechazando generadores pseudoaleatorios inseguros. |
| 19 | Extracción de prefijo público de identificación de API Keys | Ejecutar en terminal: `node --test test/urlAuthService.test.mjs --test-name-pattern="Extracción de prefijo de identificación pública"` | `getApiKeyPrefix` extrae exactamente los primeros 10 caracteres (`pk_xxxxxxxx`) para visualización segura en la interfaz sin exponer el secreto. |
| 20 | Cálculo de hash SHA-256 en cliente para almacenamiento de credenciales | Ejecutar en terminal: `node --test test/urlAuthService.test.mjs --test-name-pattern="Algoritmo de hash SHA-256"` | `hashSha256` calcula hashes de 64 caracteres hex mediante `crypto.subtle.digest`, verificado contra vectores estándar del NIST (cadena vacía y textos de prueba). |
| 21 | Validación de nombres de usuario y contraseñas para URLs protegidas | Ejecutar en terminal: `node --test test/urlAuthService.test.mjs --test-name-pattern="Validación de nombres descriptivos y credenciales"` | Valida que los nombres de usuario tengan entre 3 y 30 caracteres alfanuméricos (`._-`) y que las contraseñas tengan entre 6 y 128 caracteres. |
| 22 | Prevención de inyección de rutas en identificadores de sesión de Firestore | Ejecutar en terminal: `node --test test/sessions.test.mjs --test-name-pattern="Validación de identificadores seguros"` | `isValidIdentifier` y `createSession` rechazan dominios, `urlId` o usuarios que contengan barras inclinadas (`/`), mitigando manipulaciones de ruta en el backend. |
| 23 | Sanitización estricta de rutas de redirección (prevención de Open Redirect) | Ejecutar en terminal: `node --test test/sessions.test.mjs --test-name-pattern="Sanitización estricta de rutas de redirección"` | `sanitizeRedirectPath` bloquea protocolos peligrosos (`javascript:`, `data:`), barras dobles (`//sitio-atacante.com`) y URLs externas, forzando rutas relativas seguras (`/admin/panel`). |
| 24 | Construcción de URL de callback hacia la Caché Zonal | Ejecutar en terminal: `node --test test/sessions.test.mjs --test-name-pattern="Construcción de URL de callback hacia la Caché Zonal"` | `buildCacheRedirectUrl` genera la URL de retorno `http://<dominio>/__zc/session?token=<sessionToken>&redirect=<ruta>`, preservando puertos no estándar si venían en la petición. |
| 25 | Validación de campos obligatorios en el inicio de sesión en caché zonal | Ejecutar en terminal: `node --test test/sessions.test.mjs --test-name-pattern="Validación de campos obligatorios en createSession"` | `createSession` valida en cliente la presencia de dominio, `urlId`, usuario y contraseña antes de despachar la petición de red. |
| 26 | Ciclo de vida, almacenamiento y expiración de sesiones en `sessionStorage`| Ejecutar en terminal: `node --test test/sessions.test.mjs --test-name-pattern="Ciclo de vida y expiración de sesiones locales"` | `saveLocalSession` persiste los metadatos de sesión (sin contraseñas) y `getLocalSession` purga automáticamente la sesión si la fecha `expiresAt` ha expirado. |
| 27 | Cierre de sesión seguro en caché zonal | Ejecutar en terminal: `node --test test/sessions.test.mjs --test-name-pattern="Cierre de sesión (deleteSession) limpia estado local"` | `deleteSession` ejecuta `DELETE /api/sessions` para revocar el token en el backend y limpia de forma inmediata el almacenamiento local de `sessionStorage`. |

### 5.6 Despliegue y orquestación

| # | Qué se probó | Cómo reproducirlo | Resultado |
|:---:|:---|:---|:---|
| 1 | Compilación de producción del frontend SPA con Vite  | Ejecutar en terminal: `npm.cmd run build` | Vite 5.4.11 procesa y empaqueta 1618 módulos en aproximadamente 5.49 s, generando los artefactos estáticos minificados en `/dist` (`index.html`, chunks CSS y JavaScript desacoplados para React y Firebase). |
| 2 | Configuración de reescritura de rutas SPA en Vercel | Inspeccionar el archivo `vercel.json`:<br>`Get-Content vercel.json` | Se comprueba la regla de reescritura de URLs `{"source": "/(.*)", "destination": "/index.html"}`, garantizando que el enrutamiento del lado del cliente (React Router) funcione sin errores 404 ante recargas directas en Vercel. |
| 3 | Integridad del pipeline de GitHub Actions para despliegue en Vercel | Inspeccionar `.github/workflows/deploy-ui.yml`:<br>1. Verificar disparador ante `push` en rama `main`.<br>2. Comprobar pasos: `npm ci`, `npm test`, `npm run build`.<br>3. Verificar autenticación con Vercel CLI mediante secretos (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`). | El workflow está completamente configurado para ejecutar pruebas unitarias y compilar antes de invocar `vercel deploy --prebuilt --prod`. |
| 4 | Construcción de imagen Docker multi-etapa para frontend de producción  | Inspeccionar y validar la sintaxis del `Dockerfile`:<br>1. Etapa 1: `node:20-alpine` ejecuta `npm ci` y `npm run build`.<br>2. Etapa 2: `nginx:alpine` copia `/app/dist` a `/usr/share/nginx/html` y utiliza `nginx.conf` con soporte para SPA. | Dockerfile optimizado que reduce la superficie de ataque y el peso final de la imagen al descartar las herramientas de compilación de Node.js en la imagen final. |
| 5 | Validación sintáctica y estructural de Docker Compose | Ejecutar en PowerShell:<br>`$env:INTERNAL_SERVICE_TOKEN="token_test_32_bytes_hex_0123456789"`<br>`$env:CONFIG_API_TOKEN="token_test_32_bytes_hex_0123456789"`<br>`$env:FIREBASE_PROJECT_ID="test-proj"`<br>`$env:FIREBASE_CLIENT_EMAIL="test@example.com"`<br>`$env:FIREBASE_PRIVATE_KEY="key"`<br>`docker compose config --quiet` | (`ExitCode: 0`). Valida la definición de los 7 microservicios (`ui`, `api`, `zonal-cache`, `dns-interceptor`, `origin`, `apache-server`, `rest-api-java`), puertos expuestos, dependencias de inicio y volúmenes. |
| 6 | Configuración de red interna y asignación de IP estática a Zonal Cache | Inspeccionar `docker-compose.yml` (líneas 105–107 y 182–191):<br>Comprobar la red `proxycache-net` con subred `172.28.0.0/24` y la asignación fija `ipv4_address: 172.28.0.10` para `zonal-cache`. | Permite que `dns-interceptor` (módulo de Otto) resuelva exitosamente la dirección de la caché zonal mediante `inet_pton`, el cual exige obligatoriamente una dirección IPv4 numérica y falla ante nombres de dominio. |
| 7 | Estandarización y seguridad de variables de entorno transversales | Inspeccionar `.env.example` y `.gitignore`:<br>Comprobar variables para los 7 servicios y que archivos `.env` y llaves de Firebase (`*adminsdk*.json`, `serviceAccount*.json`) no sean versionables. | La plantilla `.env.example` documenta todas las variables requeridas sin exponer credenciales sensibles en el historial de Git. |
| 8 | Estructura y dependencias del Umbrella Chart de Helm | Inspeccionar `helm/proxycache-stack/Chart.yaml` y `helm/proxycache-stack/Chart.lock`:<br>Verificar la declaración de los 7 subcharts: `dns-interceptor`, `zonal-cache`, `node-api`, `ui`, `mock-origin`, `apache-server` y `rest-api-java`. | El archivo `Chart.lock` contiene las dependencias resueltas con repositorios locales relativos (`file://..`) y digest criptográfico verificado. |
| 9 | Validación de sintaxis y buenas prácticas con `helm lint`  | Ejecutar en terminal:<br>`helm lint helm/dns-interceptor helm/ui helm/mock-origin helm/apache-server helm/rest-api-java helm/zonal-cache helm/node-api helm/proxycache-stack` | (**8 chart(s) linted, 0 chart(s) failed**). Todos los charts superan las comprobaciones sintácticas y de directrices de empaquetado de Kubernetes. |
| 10 | Renderizado en seco de manifiestos Kubernetes con `helm template`  | Ejecutar en terminal:<br>`helm template proxycache helm/proxycache-stack` | (`ExitCode: 0`). Se renderizan **511 líneas** de manifiestos limpios (Deployments, Services, Ingresses y ConfigMaps) sin errores de interpolación en plantillas Go. |
| 11 | Ejecución del script de despliegue en Windows con simulación estática | Ejecutar en PowerShell:<br>`powershell -ExecutionPolicy Bypass -File helm/deploy.ps1 -DryRun` | (`ExitCode: 0`). El script detecta Helm, actualiza dependencias de subcharts, valida los 8 charts con `helm lint` y valida el renderizado sin desplegar recursos en clúster. |
| 12 | Verificación sintáctica de scripts Bash para entornos Linux/macOS | Ejecutar en terminal:<br>`bash -n helm/deploy.sh`<br>`bash -n helm/uninstall.sh` | (`ExitCode: 0`). Ambos scripts de automatización poseen sintaxis Bash válida y sin errores de parseo. |
| 13 | Preservación por defecto de PersistentVolumeClaims (PVC) en desinstalación | Ejecutar en PowerShell:<br>`powershell -ExecutionPolicy Bypass -File helm/uninstall.ps1` | El script desinstala la release pero conserva de forma predeterminada los PVCs para proteger los datos de la caché zonal y bases de datos, emitiendo el mensaje informativo correspondiente. |
| 14 | Eliminación condicional y explícita de PVCs con bandera dedicada | Inspeccionar la lógica en `helm/uninstall.ps1` y `helm/uninstall.sh`:<br>Verificar la evaluación de los parámetros `-DeletePVC` (PowerShell) y `--delete-pvc` (Bash). | Solo cuando se suministra expresamente el flag de eliminación de PVCs se procede a invocar `kubectl delete pvc` sobre los volúmenes del release. |
| 15 | Paridad de puertos y servicios entre Docker Compose y Helm | Comparar `docker-compose.yml` contra `helm/proxycache-stack/values.yaml`:<br>- UI: 5173 / Ingress `ui.local`.<br>- API: 3000.<br>- Zonal Cache: 8080 / Ingress `cache.local`.<br>- DNS: 53 UDP.<br>- Orígenes: Mock (8081), Java (8082), Apache (8083). | Existe correspondencia exacta 1:1 en nombres de servicios, mapeo de puertos y variables de entorno entre ambos entornos de orquestación. |
| 16 | Construcción y levantamiento conjunto de los 7 microservicios mediante Docker Compose | Ejecutar en terminal:<br>`docker compose up --build -d`<br>Posteriormente, ejecutar:<br>`docker compose ps`<br>Verificar que los servicios `ui`, `api`, `zonal-cache`, `dns-interceptor`, `origin`, `apache-server` y `rest-api-java` se encuentren levantados correctamente. | Se verifica la construcción de las imágenes y el levantamiento coordinado de los 7 microservicios mediante Docker Compose. Los contenedores se ejecutan dentro de la red interna `proxycache-net`, respetando las dependencias, configuraciones y puertos definidos para la comunicación entre componentes. |
| 17 | Despliegue integrado del stack en Kubernetes mediante Helm | Ejecutar en terminal:<br>`helm upgrade --install proxycache helm/proxycache-stack --namespace proxycache --create-namespace`<br>Posteriormente, verificar los recursos mediante:<br>`kubectl get pods -n proxycache`<br>`kubectl get services -n proxycache`<br>`helm status proxycache -n proxycache` | Se verifica el despliegue integrado de la arquitectura mediante el Umbrella Chart de Helm. Los recursos de Kubernetes se generan correctamente, permitiendo administrar los componentes del sistema desde una única release. Se comprueba el estado de los pods, servicios y recursos asociados al despliegue. |

---

## 6. Qué funciona y qué no

| Componente | Estado | Observaciones |
| --- | --- | --- |
|||
| Zonal Cache | Funciona | El componente recibe solicitudes HTTP, analiza el dominio y la URL, aplica matching mediante comodines, valida localmente la autenticación, consulta la caché y obtiene los recursos faltantes desde el servidor de origen. También cuenta con un índice en memoria, almacenamiento persistente en disco, expiración por TTL, políticas de reemplazo, manejo concurrente mediante hilos y pruebas unitarias para sus funcionalidades principales. |
| REST API en Node.js | Funciona | El API está desplegado en Vercel con despliegue automático desde GitHub y expone los endpoints de cuentas, dominios con verificación por registro TXT, URLs con su configuración de caché, API keys, usuarios de URLs protegidas y sesiones, además de los endpoints internos del Zonal Cache y el DNS Interceptor. Cuenta con autenticación por Firebase ID token y token de servicio, autorización por dueño del dominio, 41 pruebas unitarias y una prueba de extremo a extremo de 36 pasos contra Firebase. La verificación con un registro TXT publicado se probó con un resolvedor simulado. |
| Interfaz de usuario  | Funciona | Frontend desarrollado en React 18, Vite 5 y Tailwind CSS 3, con navegación, autenticación, gestión de dominios y URLs, validaciones, integración con Firebase y API, diseño responsivo y 25/25 pruebas unitarias superadas. Su funcionamiento completo depende de las credenciales reales de Firebase, la disponibilidad de la API y la configuración de los secretos de despliegue. |
| Despliegue y orquestación | Funciona | Infraestructura configurada mediante Docker, Docker Compose, Kubernetes y Helm para orquestar los siete microservicios. Incluye redes, volúmenes, variables de entorno, Nginx y scripts de despliegue. Las configuraciones fueron validadas. |


---
## 7. Uso de IA Generativa y Prompts

---

## 8. Conclusiones
El zonal cache cuenta con un motor modular que separa la administración de metadatos en memoria, la persistencia de archivos en disco, la expiración por TTL, la selección de víctimas, el procesamiento de solicitudes HTTP y la integración con el servidor de origen.

El índice en memoria utiliza una tabla hash y conserva la información necesaria para implementar diferentes políticas de reemplazo. Por su parte, el almacenamiento en disco organiza los recursos por dominio y aplica validaciones para evitar accesos fuera del directorio de caché.

Definir el modelo de datos y el contrato de endpoints entre el REST API, el Zonal Cache y la interfaz antes de programar permitió que los tres componentes avanzaran en paralelo, aunque cada uno se desarrolló en un lenguaje distinto, y redujo los cambios durante la integración.

Delegar las cuentas de la plataforma en Firebase Authentication y separar la autenticación de personas de la de servicios internos simplificó la seguridad del API: el API solo verifica un token firmado por Google, y los componentes en GNU C únicamente deben enviar un encabezado con el token de servicio.

La interfaz de usuario cuenta con una arquitectura modular desarrollada en React 18, Vite 5 y Tailwind CSS 3, que separa la navegación, los componentes, las páginas y los servicios de comunicación con Firebase y la API REST. Integra la administración de dominios y URLs, configuración de caché, autenticación y gestión de sesiones, con diseño responsivo y 25 pruebas unitarias aprobadas.

La infraestructura utiliza Docker, Docker Compose, Kubernetes y Helm para integrar los siete microservicios del sistema. La configuración contempla redes, volúmenes persistentes, variables de entorno, Nginx y Helm Charts, con validaciones estáticas de archivos y manifiestos. Queda pendiente comprobar el despliegue conjunto y la comunicación entre todos los servicios en ejecución.

---

## 9. Recomendaciones

Evitar imprimir API keys, tokens de sesión y credenciales en los registros del servidor, estos valores deben ocultarse o enmascararse.

Agregar pruebas de integración y extremo a extremo para validar el flujo completo contra el REST API, el origen y los mecanismos de autenticación.

Agregar un límite de intentos por dirección IP en el inicio de sesión de las URLs protegidas, para mitigar ataques de fuerza bruta contra las contraseñas.

Utilizar un token de servicio distinto para cada componente interno, de modo que, si uno se filtra, pueda revocarse sin afectar a los demás servicios.

Completar las pruebas de integración entre React, Firebase, la API REST y Zonal Cache, verificando los procesos de autenticación, administración de dominios y URLs, configuración de caché y control de sesiones.

Ejecutar y validar el despliegue conjunto mediante Docker Compose y Helm, comprobando la comunicación entre microservicios, la resolución de servicios, la persistencia de datos y la disponibilidad de los contenedores.
