# Contrato entre el REST API en Node.js y las cachés zonales

Tarea **T-31**. Responsable: Luis Diego Delgado Muñoz. Consumidores: Zonal Cache (Rafael Araya,
T-11, T-13, T-14 y T-15) y DNS Interceptor (Otto Segura, T-18).

Este documento define los endpoints internos que el Zonal Cache y el DNS Interceptor usan para leer
la configuración guardada en Firestore. El modelo de datos de fondo está en
[modelo-datos.md](modelo-datos.md).

## 1. Convenciones

- **URL base:** se inyecta por variable de entorno, `CONFIG_API_URL`. Ejemplo:
  `https://<proyecto>.vercel.app`.
- **Autenticación del servicio:** todas las peticiones a `/api/internal/*` llevan el encabezado
  `Authorization: Bearer <token>`. El token se inyecta por la variable de entorno
  `CONFIG_API_TOKEN` en la caché y el DNS Interceptor, y por `INTERNAL_SERVICE_TOKEN` en el API. Sin
  token, o con uno incorrecto, el API responde `401`.
- **Formato:** JSON en UTF-8. Las peticiones con cuerpo llevan `Content-Type: application/json`.
- **Unidades:** tamaños en bytes, TTL en segundos, fechas en ISO 8601 (UTC).
- **Errores:** siempre con esta forma:

  ```json
  { "error": { "code": "DOMAIN_NOT_FOUND", "message": "Domain is not registered or not verified" } }
  ```

- **HTTPS:** el API corre en Vercel, que solo acepta HTTPS. Para estas llamadas la caché necesita
  un cliente con TLS (libcurl).

| Código | Significado |
| --- | --- |
| `200` | Correcto |
| `400` | Cuerpo inválido o campos faltantes |
| `401` | Falta el token de servicio o es incorrecto |
| `404` | Dominio no registrado o no verificado |
| `500` | Error interno del API |

## 2. Endpoints

### 2.1 Configuración de un dominio

```http
GET /api/internal/domains/{domain}/config
Authorization: Bearer <token>
```

`{domain}` es el valor del encabezado `Host` de la petición del cliente, sin puerto. El API lo
normaliza a minúscula.

Respuesta `200`:

```json
{
  "domain": "example.com",
  "origin": { "scheme": "http", "host": "apache.default.svc.cluster.local", "port": 80 },
  "cacheSizeBytes": 104857600,
  "urls": [
    {
      "id": "u2",
      "pattern": "/admin/*",
      "cacheSizeBytes": 10485760,
      "auth": { "type": "user_password" },
      "fileTypes": [
        { "extension": "*", "ttlSeconds": 30, "policy": "MRU" }
      ]
    },
    {
      "id": "u1",
      "pattern": "/*",
      "cacheSizeBytes": 52428800,
      "auth": { "type": "none" },
      "fileTypes": [
        { "extension": "html", "ttlSeconds": 60, "policy": "LRU" },
        { "extension": "png", "ttlSeconds": 86400, "policy": "FIFO" }
      ]
    }
  ]
}
```

- `urls` viene **ordenado de más a menos específico**. La caché recorre la lista y usa la primera
  URL cuyo `pattern` coincida con la ruta pedida. Si ninguna coincide, la petición se reenvía al
  origen sin cachear y sin autenticación.
- `fileTypes` se entrega como **arreglo** (no como mapa) para que sea simple de recorrer desde C.
  `extension: "*"` es el valor por defecto. Si la extensión no aparece y no hay `*`, el recurso no
  se cachea.
- `policy` es uno de `LRU`, `LFU`, `FIFO`, `MRU`, `RANDOM`.
- `auth.type` es uno de `none`, `api_key`, `user_password`.
- Las reglas del comodín `*` están en [modelo-datos.md](modelo-datos.md#33-domainsdomainurlsurlid--urls-del-dominio).

Se recomienda que la caché guarde esta respuesta en memoria por unos segundos
(`CONFIG_REFRESH_SECONDS`) en lugar de pedirla en cada petición.

### 2.2 Validar una API key

Se usa cuando la URL tiene `auth.type = "api_key"` y el cliente envió el encabezado `x-api-key`.

```http
POST /api/internal/validate/api-key
Authorization: Bearer <token>
Content-Type: application/json

{ "domain": "example.com", "urlId": "u3", "apiKey": "pk_3fa91c2..." }
```

Respuesta `200`:

```json
{ "valid": true }
```

`valid` es `false` si la key no existe o si pertenece a otro dominio o a otra URL. Una key inválida
**no** es un error del API: responde `200` con `valid: false`. La caché responde al cliente
`401 Unauthorized`.

### 2.3 Validar una sesión

Se usa cuando la URL tiene `auth.type = "user_password"` y el cliente envía la cookie de sesión.

```http
POST /api/internal/validate/session
Authorization: Bearer <token>
Content-Type: application/json

{ "domain": "example.com", "urlId": "u2", "sessionToken": "st_8a1f..." }
```

Respuesta `200`:

```json
{ "valid": true, "username": "ana", "expiresAt": "2026-10-15T23:00:00Z" }
```

Si la sesión no existe, venció, o pertenece a otro dominio o a otra URL, responde
`{ "valid": false }`.

### 2.4 Lista de dominios verificados (DNS Interceptor)

```http
GET /api/internal/domains
Authorization: Bearer <token>
```

Respuesta `200`:

```json
{ "domains": ["example.com", "otro-dominio.com"] }
```

Le permite al DNS Interceptor saber qué dominios interceptar. La asociación país → IP de caché zonal
es infraestructura del clúster y no vive en Firestore; se configura en el Helm Chart del
interceptor.

## 3. Flujo de usuario y contraseña (T-14 y T-15)

La UI corre en un dominio de Vercel, distinto del dominio cacheado, así que no puede escribir una
cookie para `example.com`. Por eso el token viaja de vuelta a la caché en un redireccionamiento y es
la caché quien guarda la cookie.

```mermaid
sequenceDiagram
    participant N as Navegador
    participant C as Zonal Cache (example.com)
    participant U as UI (Vercel)
    participant A as REST API (Vercel)

    N->>C: GET /admin/panel (sin cookie)
    C->>N: 302 a UI /login?domain=example.com&urlId=u2&redirect=http://example.com/admin/panel
    N->>U: GET /login?...
    U->>A: POST /api/sessions {domain, urlId, username, password}
    A->>U: 200 {sessionToken, expiresAt}
    U->>N: 302 a http://example.com/__zc/session?token=st_...&redirect=/admin/panel
    N->>C: GET /__zc/session?token=st_...&redirect=/admin/panel
    C->>A: POST /api/internal/validate/session
    A->>C: {valid: true}
    C->>N: 302 a /admin/panel + Set-Cookie: zc_session=st_...; HttpOnly; Path=/
    N->>C: GET /admin/panel (Cookie: zc_session=st_...)
    C->>A: POST /api/internal/validate/session
    A->>C: {valid: true}
    C->>N: 200 recurso (desde caché u origen)
```

Detalles:

- La URL del formulario de la UI se inyecta en la caché por la variable de entorno `AUTH_UI_URL`.
- `/__zc/session` es una ruta reservada que la caché atiende ella misma y nunca reenvía al origen.
  La caché solo debe aceptar en `redirect` rutas relativas que empiecen con `/`, para no convertirse
  en un redireccionador abierto.
- La cookie se llama `zc_session`.
- **Cerrar sesión:** la UI llama a `DELETE /api/sessions` con el cuerpo
  `{ "sessionToken": "st_..." }` y responde `204`. La sesión deja de ser válida de inmediato.

## 4. Endpoint público que usa la UI para iniciar sesión

No es interno (no lleva token de servicio), pero se documenta aquí porque forma parte del flujo
anterior.

```http
POST /api/sessions
Content-Type: application/json

{ "domain": "example.com", "urlId": "u2", "username": "ana", "password": "..." }
```

Respuesta `200`:

```json
{ "sessionToken": "st_8a1f...", "expiresAt": "2026-10-15T23:00:00Z" }
```

Si las credenciales no son correctas responde `401` con `INVALID_CREDENTIALS`.

## 5. Variables de entorno resumidas

| Componente | Variable | Ejemplo |
| --- | --- | --- |
| Zonal Cache / DNS Interceptor | `CONFIG_API_URL` | `https://proxycache-api.vercel.app` |
| Zonal Cache / DNS Interceptor | `CONFIG_API_TOKEN` | secreto compartido |
| Zonal Cache | `CONFIG_REFRESH_SECONDS` | `30` |
| Zonal Cache | `AUTH_UI_URL` | `https://proxycache-ui.vercel.app/login` |
| REST API en Node.js | `INTERNAL_SERVICE_TOKEN` | mismo secreto que `CONFIG_API_TOKEN` |
