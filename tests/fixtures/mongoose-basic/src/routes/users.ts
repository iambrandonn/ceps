import { Router } from 'express';
import { User } from '../models/User.js';

export const usersRouter = Router();

usersRouter.get('/', async (req, res) => {
  const users = await User.find().exec();
  res.json(users);
});

usersRouter.post('/', async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
});

usersRouter.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).exec();
  if (!user) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(user);
});
