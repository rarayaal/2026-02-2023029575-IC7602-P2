/** Servidor para desarrollo local. En Vercel se usa api/index.js. */
import app from './src/app.js';
import { port } from './src/config/env.js';

const listenPort = port();
app.listen(listenPort, () => {
  console.log(`[node-api] listening on http://localhost:${listenPort}`);
});
