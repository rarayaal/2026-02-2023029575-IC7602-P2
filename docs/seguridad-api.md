# Mecanismo de seguridad del REST API en Node.js

Tarea **T-32**. Responsable: Luis Diego Delgado Muñoz.

El enunciado pide investigar, implementar y documentar un mecanismo de autenticación y autorización
para el REST API en Node.js. Este documento explica qué se eligió, por qué, cómo funciona y cómo se
prueba.

## 1. Quién llama al API

El API tiene tres tipos de clientes, y cada uno necesita un mecanismo distinto:

| Cliente | Ejemplo | Qué necesita demostrar |
| --- | --- | --- |
| Persona usuaria de la plataforma | Alguien que administra sus dominios desde la UI | Que es dueña de la cuenta y de los dominios que modifica |
| Servicio interno | Zonal Cache, DNS Interceptor | Que es un componente del sistema y no un tercero |
| Persona que entra a una URL protegida | Visitante de `/admin/*` de un dominio | Que conoce el usuario y la contraseña definidos para esa URL |

## 2. Alternativas evaluadas

| Alternativa | Ventajas | Desventajas | Decisión |
| --- | --- | --- | --- |
| Sesiones propias con cookie | Simple de entender | El API y la UI viven en dominios distintos de Vercel; las cookies entre dominios requieren `SameSite=None` y complican CORS. Hay que guardar y limpiar sesiones | Descartada para la UI |
| JWT propio firmado por el API | Sin estado en el servidor | Hay que implementar registro, hash de contraseñas, recuperación, rotación de llaves y revocación | Descartada |
| **Firebase Authentication (ID token)** | Google administra contraseñas, firmas y expiración. Ya se usa Firebase para los datos. El Admin SDK verifica el token sin llamadas extra | Depende de un servicio externo | **Elegida para la UI** |
| API key por cliente en un encabezado | Muy simple, fácil desde GNU C | No identifica personas | **Elegida para los servicios internos** |
| OAuth 2.0 *client credentials* | Estándar para servicio a servicio | Excesivo para tres componentes del mismo sistema | Descartada |

## 3. Autenticación de la UI: Firebase ID token

1. La UI registra la cuenta con `POST /api/users`. El API crea la cuenta en Firebase
   Authentication con el Admin SDK y guarda el perfil en `users/{uid}`.
2. La UI inicia sesión con el SDK web de Firebase (`signInWithEmailAndPassword`) y obtiene un
   **ID token**: un JWT firmado por Google con RS256, que dura una hora y que el SDK renueva solo.
3. En cada petición, la UI envía `Authorization: Bearer <idToken>`.
4. El middleware `requireUser` ([userAuth.js](../node-api/src/middleware/userAuth.js)) llama a
   `verifyIdToken`, que comprueba la firma con las llaves públicas de Google, la expiración, el
   emisor y que el token sea de este proyecto. Si todo es correcto, deja `req.user.uid` disponible
   para la ruta. Si no, responde `401`.

El API nunca recibe ni guarda la contraseña de la plataforma después del registro: la administra
Firebase Authentication.

## 4. Autorización: cada persona solo toca lo suyo

Autenticar dice **quién** es; autorizar dice **qué puede hacer**. Cada dominio guarda `ownerUid`, y
todas las rutas de dominios, URLs, API keys y usuarios pasan por `loadOwnedDomain`
([firestore.js](../node-api/src/lib/firestore.js)):

- Si el dominio no existe, responde `404 DOMAIN_NOT_FOUND`.
- Si existe pero `ownerUid` no coincide con `req.user.uid`, responde `403 FORBIDDEN`.

Así, aunque alguien tenga una cuenta válida, no puede leer ni modificar dominios de otra persona.

## 5. Autenticación de servicios internos: token de servicio

El Zonal Cache y el DNS Interceptor llaman a `/api/internal/*` con
`Authorization: Bearer <token>`, donde el token es un secreto compartido de 256 bits generado al
azar e inyectado por variables de entorno (`INTERNAL_SERVICE_TOKEN` en el API y `CONFIG_API_TOKEN`
en la caché).

El middleware `requireServiceToken` ([serviceAuth.js](../node-api/src/middleware/serviceAuth.js))
compara el SHA-256 del token recibido con el del esperado usando `timingSafeEqual`. Comparar los
hashes garantiza que los dos buffers midan lo mismo, y la comparación en tiempo constante evita que
un atacante adivine el token midiendo cuánto tarda la respuesta.

## 6. Credenciales de las URLs protegidas

Estas credenciales protegen el contenido que sirve el Zonal Cache, no el API, pero el API las
administra y valida:

| Credencial | Cómo se guarda | Cómo se valida |
| --- | --- | --- |
| API key (`pk_` + 64 hex) | La UI la genera en el navegador y envía solo su **SHA-256**. El ID del documento en `apiKeys` es ese hash; la key en claro nunca llega al servidor | La caché envía la key recibida en `x-api-key`; el API calcula su hash y busca el documento. Además comprueba que sea del mismo dominio y URL |
| Usuario y contraseña | Hash **bcrypt** con sal y costo configurable (`BCRYPT_ROUNDS`) | `POST /api/sessions` compara con `bcrypt.compare` |
| Sesión (`st_` + 64 hex) | Se guarda el SHA-256 del token, con `expiresAt` | La caché la valida con `POST /api/internal/validate/session`; se rechaza si venció o es de otra URL |

Detalles adicionales:

- **Mismo error para usuario inexistente y contraseña incorrecta** (`401 INVALID_CREDENTIALS`).
  Cuando el usuario no existe, igual se ejecuta un `bcrypt.compare` contra un hash ficticio para que
  la respuesta tarde lo mismo y no revele qué usuarios existen.
- **Revocación inmediata**: cambiar la contraseña o eliminar un usuario borra sus sesiones;
  eliminar una API key la invalida en la siguiente validación; cerrar sesión borra el documento.
- **Cambio de mecanismo**: si una URL pasa de `api_key` a otro tipo, sus keys se eliminan; si deja
  de ser `user_password`, se eliminan sus usuarios y sesiones.

## 7. Otras medidas

| Medida | Dónde |
| --- | --- |
| HTTPS obligatorio en producción (Vercel no acepta HTTP) | Plataforma |
| CORS restringido a los orígenes de `CORS_ORIGINS` | [cors.js](../node-api/src/middleware/cors.js) |
| Validación estricta de todos los cuerpos antes de tocar Firestore | [validation.js](../node-api/src/lib/validation.js) |
| Límite de 100 KB por cuerpo JSON | [app.js](../node-api/src/app.js) |
| Reglas de Firestore que niegan todo acceso directo de clientes; solo el Admin SDK del API entra | [modelo-datos.md](modelo-datos.md#5-reglas-de-seguridad-de-firestore) |
| Secretos solo por variables de entorno, nunca en el repositorio | `.env.example`, Vercel, GitHub Secrets |
| Errores sin detalles internos: los no controlados responden `500 INTERNAL_ERROR` | [errors.js](../node-api/src/middleware/errors.js) |

## 8. Cómo probarlo

```bash
cd node-api
npm test          # 41 pruebas, incluye 401 sin token, token incorrecto y CORS
npm run e2e       # 36 pasos contra Firebase real (requiere .env completo y el API corriendo)
```

Pruebas manuales con curl:

```bash
# Sin ID token: 401 MISSING_ID_TOKEN
curl -i https://ic7602-p2-node-api.vercel.app/api/domains

# Endpoint interno con token incorrecto: 401 INVALID_SERVICE_TOKEN
curl -i -H "Authorization: Bearer incorrecto" https://ic7602-p2-node-api.vercel.app/api/internal/domains
```

## 9. Limitaciones conocidas

- No hay límite de intentos de inicio de sesión en `POST /api/sessions`. Firebase Authentication sí
  lo aplica para las cuentas de la plataforma.
- El token de servicio es uno solo para todos los servicios internos; si se filtra, hay que rotarlo
  en todos los componentes a la vez.
