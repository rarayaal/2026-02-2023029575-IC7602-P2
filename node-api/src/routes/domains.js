/**
 * Dominios de la persona autenticada y su verificación por registro TXT (T-28).
 * Las URLs y sus credenciales se montan debajo, en urls.js.
 */
import { Router } from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../config/firebase.js';
import { deleteDomainCascade, domainRef, loadOwnedDomain, toIso } from '../lib/firestore.js';
import { isDomainVerified, newVerificationToken, txtRecordFor } from '../lib/txt.js';
import { validateCacheSize, validateDomainName, validateOrigin } from '../lib/validation.js';
import { ApiError } from '../middleware/errors.js';
import { requireUser } from '../middleware/userAuth.js';
import urls from './urls.js';

const router = Router();
router.use(requireUser);

const toDomain = (doc) => {
  const data = doc.data();
  return {
    name: doc.id,
    origin: data.origin,
    cacheSizeBytes: data.cacheSizeBytes,
    verification: {
      status: data.verification.status,
      verifiedAt: toIso(data.verification.verifiedAt),
    },
    txtRecord: txtRecordFor(doc.id, data.verification.token),
    createdAt: toIso(data.createdAt),
    updatedAt: toIso(data.updatedAt),
  };
};

router.get('/', async (req, res) => {
  const snapshot = await db().collection('domains').where('ownerUid', '==', req.user.uid).get();
  const domains = snapshot.docs.map(toDomain).sort((a, b) => a.name.localeCompare(b.name));
  res.json({ domains });
});

/** Registra el dominio en estado pending y devuelve el registro TXT a publicar. */
router.post('/', async (req, res) => {
  const name = validateDomainName(req.body?.name);
  const origin = validateOrigin(req.body?.origin);
  const cacheSizeBytes = validateCacheSize(req.body?.cacheSizeBytes);
  const ref = domainRef(name);

  try {
    // create() falla si el documento ya existe, así no hay condición de carrera.
    await ref.create({
      name,
      ownerUid: req.user.uid,
      origin,
      cacheSizeBytes,
      verification: { status: 'pending', token: newVerificationToken(), verifiedAt: null },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    if (err.code === 6 /* ALREADY_EXISTS */) {
      throw new ApiError(409, 'DOMAIN_ALREADY_EXISTS', 'Domain is already registered');
    }
    throw err;
  }

  res.status(201).json(toDomain(await ref.get()));
});

router.get('/:domain', async (req, res) => {
  const { doc } = await loadOwnedDomain(req.params.domain, req.user.uid);
  res.json(toDomain(doc));
});

router.delete('/:domain', async (req, res) => {
  const { ref } = await loadOwnedDomain(req.params.domain, req.user.uid);
  await deleteDomainCascade(ref);
  res.sendStatus(204);
});

/** Consulta el registro TXT y, si coincide, marca el dominio como verificado. */
router.post('/:domain/verify', async (req, res) => {
  const { ref, doc } = await loadOwnedDomain(req.params.domain, req.user.uid);

  if (doc.get('verification.status') !== 'verified') {
    const verified = await isDomainVerified(doc.id, doc.get('verification.token'));
    if (verified) {
      await ref.update({
        'verification.status': 'verified',
        'verification.verifiedAt': FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  const domain = toDomain(await ref.get());
  res.json({ ...domain, status: domain.verification.status, verified: domain.verification.status === 'verified' });
});

router.use('/:domain/urls', urls);

export default router;
