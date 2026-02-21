import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../auth/middleware';
import { registerRepo, listUserRegistrations } from './service';
import type { AuthUser } from '../auth/passport';

export const registryRouter = Router();

// POST /api/v1/registrations — register a GitHub repo
registryRouter.post(
  '/registrations',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { owner, repo } = req.body as { owner: string; repo: string };
      if (!owner || !repo) {
        res.status(400).json({ error: 'owner and repo are required' });
        return;
      }

      const user = req.user as AuthUser;
      // GitHub token would come from session/OAuth; for now surface a clear error if missing
      const githubToken = (req.session as unknown as Record<string, unknown>).githubToken as string | undefined;
      if (!githubToken) {
        res.status(403).json({ error: 'GitHub token not available in session' });
        return;
      }

      const result = await registerRepo(owner, repo, user.userId, githubToken);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/registrations — list user's registered repos
registryRouter.get(
  '/registrations',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as AuthUser;
      const registrations = await listUserRegistrations(user.userId);
      res.json(registrations.map(r => ({
        owner: r.owner,
        repo: r.repo,
        webhookId: r.webhookId,
        status: r.status,
        createdAt: r.createdAt,
      })));
    } catch (err) {
      next(err);
    }
  }
);
