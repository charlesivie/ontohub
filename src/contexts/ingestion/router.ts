import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { verifyGithubSignature } from '../../lib/hmac';
import { decrypt } from '../../lib/crypto';
import { config } from '../../config';
import { getRegistrationSecret, writeIngestionEvent } from '../registry/repository';
import { runPipeline } from './pipeline';

export const ingestionRouter = Router();

// Use raw body for HMAC validation
ingestionRouter.use(
  '/:owner/:repo',
  (req, _res, next) => {
    // express.raw middleware for this route
    if (req.headers['content-type'] === 'application/json') {
      let data = Buffer.alloc(0);
      req.on('data', (chunk: Buffer) => { data = Buffer.concat([data, chunk]); });
      req.on('end', () => {
        (req as unknown as { rawBody: Buffer }).rawBody = data;
        try {
          req.body = JSON.parse(data.toString('utf8'));
        } catch {
          req.body = {};
        }
        next();
      });
    } else {
      next();
    }
  }
);

ingestionRouter.post(
  '/:owner/:repo',
  async (req: Request, res: Response, next: NextFunction) => {
    const { owner, repo } = req.params;
    const signature = req.headers['x-hub-signature-256'] as string | undefined;
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;

    if (!signature || !rawBody) {
      res.status(400).json({ error: 'Missing signature or body' });
      return;
    }

    try {
      // Retrieve and decrypt webhook secret
      const encryptedSecret = await getRegistrationSecret(owner, repo);
      if (!encryptedSecret) {
        res.status(404).json({ error: 'Registration not found' });
        return;
      }
      const secret = decrypt(encryptedSecret, config.webhookEncryptionKey);

      // Validate HMAC
      if (!verifyGithubSignature(rawBody, signature, secret)) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      // Parse GitHub event
      const event = req.headers['x-github-event'] as string;
      const payload = req.body as Record<string, unknown>;
      const ref = (payload.ref as string) ?? (payload.release as Record<string, string>)?.tag_name ?? 'HEAD';
      const version = ref.replace(/^refs\/tags\//, '');

      // Write IngestionEvent with status Queued BEFORE firing pipeline
      const eventUri = `urn:ontohub:event:${uuidv4()}`;
      const registrationUri = `urn:ontohub:registration:${owner}:${repo}`;
      await writeIngestionEvent({
        eventUri,
        registrationUri,
        gitRef: ref,
        status: 'Queued',
        createdAt: new Date().toISOString(),
      });

      // Fire pipeline — NEVER await inside handler
      runPipeline({ owner, repo, ref, version, eventUri }).catch((err) => {
        console.error('[webhook] Unhandled pipeline rejection:', err);
      });

      // Respond immediately
      res.status(202).json({ accepted: true, eventUri });
    } catch (err) {
      next(err);
    }
  }
);
