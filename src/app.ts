import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import { config } from './config';
import { authRouter } from './contexts/auth/router';
import { registryRouter } from './contexts/registry/router';
import { ingestionRouter } from './contexts/ingestion/router';
import { discoveryRouter } from './contexts/discovery/router';

export function createApp(): express.Express {
  const app = express();

  app.use(cors({
    origin: config.frontendOrigin,
    credentials: true,
  }));

  app.use(express.json());
  app.use(express.raw({ type: 'application/octet-stream', limit: '10mb' }));

  app.use(session({
    name: 'ontohub_session',
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
    },
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Auth routes (no /api/v1 prefix — proxied from Next.js /api/auth/*)
  app.use('/auth', authRouter);

  // API routes
  app.use('/api/v1', registryRouter);
  app.use('/api/v1', discoveryRouter);

  // Webhook routes
  app.use('/webhooks', ingestionRouter);

  return app;
}
