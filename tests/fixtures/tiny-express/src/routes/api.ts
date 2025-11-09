import { Router } from 'express';

const apiRouter = Router();

apiRouter.get('/status', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

apiRouter.get('/health', (req, res) => {
  res.json({ healthy: true });
});

export default apiRouter;
