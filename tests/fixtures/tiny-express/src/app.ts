import express from 'express';
import { usersRouter } from './routes/users.js';
import { postsRouter } from './routes/posts.js';
import { authMiddleware } from './middleware/auth.js';

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(authMiddleware);

  app.use('/users', usersRouter);
  app.use('/posts', postsRouter);

  return app;
}
