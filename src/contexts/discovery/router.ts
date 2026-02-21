import { Router, Request, Response, NextFunction } from 'express';
import { listOntologies, getOntologyVersion } from './service';

export const discoveryRouter = Router();

// GET /api/v1/ontologies
discoveryRouter.get(
  '/ontologies',
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const ontologies = await listOntologies();
      res.json(ontologies);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/v1/ontologies/:owner/:repo/:version
discoveryRouter.get(
  '/ontologies/:owner/:repo/:version',
  async (req: Request, res: Response, next: NextFunction) => {
    const { owner, repo, version } = req.params;
    try {
      const result = await getOntologyVersion(owner, repo, version);
      if (!result) {
        res.status(404).json({ error: 'Ontology version not found' });
        return;
      }
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);
