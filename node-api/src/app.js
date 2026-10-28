/**
 * Aplicación Express. Se exporta sin llamar a listen() para que la use tanto el
 * servidor local (server.js) como la función serverless de Vercel (api/index.js).
 */
import express from 'express';
import { cors } from './middleware/cors.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import domains from './routes/domains.js';
import health from './routes/health.js';
import internal from './routes/internal.js';
import sessions from './routes/sessions.js';
import users from './routes/users.js';

const app = express();

app.disable('x-powered-by');
app.use(cors);
app.use(express.json({ limit: '100kb' }));

app.use('/api/health', health);
app.use('/api/internal', internal);
app.use('/api/users', users);
app.use('/api/domains', domains);
app.use('/api/sessions', sessions);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
