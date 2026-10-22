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
│   ├── middleware/       autenticación y manejo de errores
│   └── routes/           un archivo por grupo de endpoints
└── test/                 pruebas
```

## Despliegue en Vercel

1. Importar el repositorio en Vercel.
2. En **Root Directory** seleccionar `node-api`.
3. Definir en **Environment Variables** las mismas variables de `.env.example`.
4. Cada push a `main` despliega a producción; cada push a otra rama genera un *preview*.

## Endpoints

| Método | Ruta | Autenticación | Estado |
| --- | --- | --- | --- |
| GET | `/api/health` | ninguna | listo |
| GET | `/api/internal/domains` | token de servicio | listo (T-31) |
| GET | `/api/internal/domains/{domain}/config` | token de servicio | listo (T-31) |
| POST | `/api/internal/validate/api-key` | token de servicio | listo (T-31) |
| POST | `/api/internal/validate/session` | token de servicio | listo (T-31) |
