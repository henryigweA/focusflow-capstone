const { Pool } = require('pg');
require('dotenv').config();

// Connection details come entirely from environment variables.
// Never hardcode credentials here — this file gets committed to Git.
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
});

module.exports = pool;
