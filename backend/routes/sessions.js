const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/sessions/stats
// NOTE: defined before "/" on purpose — order matters for Express routers,
// this just doesn't happen to collide here since there's no "/:id" route.
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total_sessions,
        COALESCE(SUM(duration), 0)::int AS total_minutes,
        COALESCE(ROUND(AVG(duration)), 0)::int AS avg_minutes
      FROM focus_sessions
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/sessions - all sessions, most recent first
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM focus_sessions ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// POST /api/sessions - log a new session
router.post('/', async (req, res) => {
  const { task, category, duration, mood } = req.body;

  if (!task || !category || !duration) {
    return res.status(400).json({ error: 'task, category, and duration are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO focus_sessions (task, category, duration, mood)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [task, category, duration, mood || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

module.exports = router;
