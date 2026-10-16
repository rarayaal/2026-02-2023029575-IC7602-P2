/**
 * Aplicación Express. Se exporta sin llamar a listen() para que la use tanto el
 * servidor local (server.js) como la función serverless de Vercel (api/index.js).
 */
import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import health from './routes/health.js';
import internal from './routes/internal.js';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.use('/api/health', health);
app.use('/api/internal', internal);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
