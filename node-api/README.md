# REST API en Node.js

API que usan la UI y las cachés zonales para interactuar con Firestore. Corre en **Vercel** con
despliegue automático desde GitHub. Responsable: Luis Diego Delgado Muñoz (T-25 a T-32).

- Modelo de datos: [docs/modelo-datos.md](../docs/modelo-datos.md)
- Contrato con el Zonal Cache y el DNS Interceptor: [docs/contrato-cache-api.md](../docs/contrato-cache-api.md)

## Requisitos

- Node.js 22 o superior
- Una cuenta de servicio de Firebase (solo para los endpoints que usan Firestore)

## Ejecutar en local

```bash
cd node-api
npm install
cp .env.example .env    # completar los valores
npm run dev
```

El API queda en `http://localhost:3000`. Para comprobar que responde:

```bash
curl http://localhost:3000/api/health
```

## Pruebas

```bash
npm test
```

Usa el runner nativo de Node (`node:test`); no requiere Firebase.

### Datos de prueba en Firestore

```bash
npm run seed
```

Crea el dominio verificado `app.local` (configurable con `SEED_DOMAIN`) con tres URLs, una por
mecanismo de autenticación: `/*` sin autenticación, `/admin/*` con usuario y contraseña, y `/api/*`
con API key. Los secretos generados (contraseña, API key y token de sesión) quedan en
`.seed-output.json`, que no se commitea. Con el API corriendo se puede probar así:

```bash
TOKEN=<valor de INTERNAL_SERVICE_TOKEN>
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/internal/domains/app.local/config
```

## Estructura

```text
node-api/
├── api/index.js          punto de entrada serverless para Vercel
├── server.js             servidor para desarrollo local
├── vercel.json           redirige todas las rutas hacia api/index.js
├── src/
│   ├── app.js            aplicación Express (rutas y middlewares)
│   ├── config/           variables de entorno y Firebase Admin SDK
│   ├── lib/              validaciones, Firestore y verificación TXT
│   ├── middleware/       autenticación, CORS y manejo de errores
│   └── routes/           un archivo por grupo de endpoints
├── scripts/            datos de prueba (seed) y prueba de punta a punta (e2e)
└── test/                 pruebas unitarias
```

## Prueba de punta a punta

```bash
npm run dev     # en otra terminal
npm run e2e
```

Crea una cuenta temporal, recorre el flujo completo de la UI (dominio, URLs, API keys, usuarios y
sesiones), consulta los endpoints internos como lo haría el Zonal Cache, y al final borra la cuenta
con todos sus datos. Requiere `FIREBASE_WEB_API_KEY` en el `.env`.

## Despliegue en Vercel

El repositorio es privado y el plan Hobby de Vercel solo permite que el dueño de la cuenta dispare
deployments desde Git. Por eso el despliegue lo hace la GitHub Action
[`deploy-node-api.yml`](../.github/workflows/deploy-node-api.yml) con la CLI de Vercel: en cada
push a `main` que toque `node-api/` corre las pruebas y despliega a producción.

1. Crear el proyecto con `npx vercel link` dentro de `node-api/`.
2. En **Settings > Environment Variables** del proyecto, definir las variables de `.env.example`
   (excepto `PORT` y `FIREBASE_WEB_API_KEY`).
3. Crear un token en **Account Settings > Tokens**.
4. En el repositorio de GitHub, definir los secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID` y
   `VERCEL_PROJECT_ID` (los dos últimos están en `node-api/.vercel/project.json`).

## Endpoints

Todas las respuestas de error tienen la forma `{ "error": { "code", "message" } }`.

**Autenticación**

- *Firebase ID token*: `Authorization: Bearer <idToken>`, obtenido por la UI al iniciar sesión con
  Firebase Authentication. Cada persona solo ve y modifica sus propios dominios.
- *Token de servicio*: `Authorization: Bearer <INTERNAL_SERVICE_TOKEN>`, para el Zonal Cache y el
  DNS Interceptor.

| Método | Ruta | Autenticación | Tarea |
| --- | --- | --- | --- |
| GET | `/api/health` | ninguna | T-26 |
| POST | `/api/users` | ninguna | T-27 |
| GET | `/api/users/me` | ID token | T-27 |
| PUT | `/api/users/me` | ID token | T-27 |
| DELETE | `/api/users/me` | ID token | T-27 |
| GET | `/api/domains` | ID token | T-28 |
| POST | `/api/domains` | ID token | T-28 |
| GET | `/api/domains/{domain}` | ID token | T-28 |
| DELETE | `/api/domains/{domain}` | ID token | T-28 |
| POST | `/api/domains/{domain}/verify` | ID token | T-28 |
| GET | `/api/domains/{domain}/urls` | ID token | T-29 |
| POST | `/api/domains/{domain}/urls` | ID token | T-29 |
| GET | `/api/domains/{domain}/urls/{urlId}` | ID token | T-29 |
| PUT | `/api/domains/{domain}/urls/{urlId}` | ID token | T-29 |
| DELETE | `/api/domains/{domain}/urls/{urlId}` | ID token | T-29 |
| GET | `/api/domains/{domain}/urls/{urlId}/api-keys` | ID token | T-30 |
| POST | `/api/domains/{domain}/urls/{urlId}/api-keys` | ID token | T-30 |
| DELETE | `/api/domains/{domain}/urls/{urlId}/api-keys/{keyId}` | ID token | T-30 |
| GET | `/api/domains/{domain}/urls/{urlId}/users` | ID token | T-30 |
| POST | `/api/domains/{domain}/urls/{urlId}/users` | ID token | T-30 |
| PUT | `/api/domains/{domain}/urls/{urlId}/users/{username}/password` | ID token | T-30 |
| DELETE | `/api/domains/{domain}/urls/{urlId}/users/{username}` | ID token | T-30 |
| POST | `/api/sessions` | ninguna | T-30 |
| DELETE | `/api/sessions` | ninguna | T-30 |
| GET | `/api/internal/domains` | token de servicio | T-31 |
| GET | `/api/internal/domains/{domain}/config` | token de servicio | T-31 |
| POST | `/api/internal/validate/api-key` | token de servicio | T-31 |
| POST | `/api/internal/validate/session` | token de servicio | T-31 |

Reglas de negocio que aplica el API:

- Un dominio solo puede registrarse una vez; queda `pending` hasta que el registro TXT coincida.
- El patrón de una URL no se repite dentro del dominio, y la suma de los `cacheSizeBytes` de sus
  URLs no supera el del dominio.
- Las API keys solo se crean en URLs `api_key` y los usuarios solo en URLs `user_password`. Al
  cambiar el mecanismo de una URL se borran las credenciales del anterior.
- La UI genera la API key en el navegador y envía solo su SHA-256 y su prefijo.
- Cambiar la contraseña o eliminar un usuario cierra sus sesiones abiertas.
- Eliminar un dominio, una URL o la cuenta borra en cascada todo lo que depende de ellos.
