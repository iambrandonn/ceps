import { Router } from 'express';
import { getDb } from '../utils/db.js';

export const usersRouter = Router();

usersRouter.get('/', async (req, res) => {
  const db = await getDb();
  const users = await db.collection('users').find().toArray();
  res.json(users);
});

usersRouter.post('/', async (req, res) => {
  const db = await getDb();
  const result = await db.collection('users').insertOne(req.body);
  res.status(201).json({ id: result.insertedId });
});

usersRouter.get('/:id', async (req, res) => {
  const db = await getDb();
  const user = await db.collection('users').findOne({ _id: req.params.id });
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});
