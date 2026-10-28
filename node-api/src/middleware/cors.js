/**
 * CORS para la UI, que corre en otro origen (su propio dominio de Vercel).
 *
 * CORS_ORIGINS es una lista separada por comas de orígenes permitidos, por ejemplo
 *   CORS_ORIGINS=https://ic7602-p2-ui.vercel.app,http://localhost:5173
 * Las cachés y el DNS Interceptor no son navegadores, así que CORS no les aplica.
 */
const allowedOrigins = () =>
  (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export function cors(req, res, next) {
  const origin = req.get('origin');
  if (origin && allowedOrigins().includes(origin)) {
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    });
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
}
