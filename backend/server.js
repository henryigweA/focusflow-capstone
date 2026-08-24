const express = require('express');
const cors = require('cors');
require('dotenv').config();

const sessionsRouter = require('./routes/sessions');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check: confirms the API is up AND can actually reach the
// database. Deploy pipelines / load balancers should check this
// before sending real traffic to a new version.
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

app.use('/api/sessions', sessionsRouter);

app.listen(PORT, () => {
  console.log(`FocusFlow backend running on port ${PORT}`);
});
