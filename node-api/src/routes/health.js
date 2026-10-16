import { Router } from 'express';

const router = Router();

/** Verificación de vida del servicio. No requiere autenticación ni Firestore. */
router.get('/', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

export default router;
