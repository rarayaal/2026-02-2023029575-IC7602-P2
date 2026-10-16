/**
 * Punto de entrada serverless para Vercel. Vercel trata cada archivo de api/ como
 * una función; vercel.json redirige todas las rutas hacia esta.
 */
import app from '../src/app.js';

export default app;
