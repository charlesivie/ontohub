import { Router, Request, Response } from 'express';
import passport from 'passport';
import { AuthUser } from './passport';
import { requireAuth } from './middleware';

export const authRouter = Router();

// Initiate GitHub OAuth flow
authRouter.get(
  '/github',
  passport.authenticate('github', { scope: ['read:user', 'repo'] })
);

// GitHub OAuth callback
authRouter.get(
  '/github/callback',
  passport.authenticate('github', { failureRedirect: '/?auth=failed' }),
  (_req: Request, res: Response) => {
    res.redirect('/repos');
  }
);

// GET /api/v1/auth/me — returns session user
authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  const user = req.user as AuthUser;
  res.json({
    userId: user.userId,
    githubLogin: user.githubLogin,
    avatarUrl: user.avatarUrl,
    displayName: user.displayName,
  });
});

// POST /api/v1/auth/logout
authRouter.post('/logout', (req: Request, res: Response, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.json({ ok: true });
  });
});
