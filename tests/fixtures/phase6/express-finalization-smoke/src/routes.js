import express from 'express';

const router = express.Router();

// Dynamic route that should trigger QID
router.get('/api/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ id: userId });
});

export default router;
