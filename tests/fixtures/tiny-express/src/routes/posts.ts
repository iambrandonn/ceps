import { Router } from 'express';
import { getDb } from '../utils/db.js';

export const postsRouter = Router();

postsRouter.get('/:id', async (req, res) => {
  const db = await getDb();
  const post = await db.collection('posts').findOne({ _id: req.params.id });
  res.json(post);
});
