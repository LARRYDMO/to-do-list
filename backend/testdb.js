const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + "/.env" });
(async () => {
  const fs = require('fs');
  const path = require('path');

  // Resolve DB SSL CA path relative to this file (__dirname) to avoid cwd issues
  let sslOption = false;
  if (process.env.DB_SSL === 'true') {
    try {
      const raw = process.env.DB_SSL_CA || '';
      const caPath = path.isAbsolute(raw) ? raw : path.resolve(__dirname, raw || '');
      console.info('testdb: resolving DB_SSL_CA to', caPath);
      // Read CA as a Buffer (no encoding) and pass as array of Buffers to TLS/pg.
      // Using Buffer avoids subtle encoding/line-ending issues that can produce
      // 'self-signed certificate in certificate chain' errors.
      const caBuf = fs.readFileSync(caPath);
      sslOption = { ca: [caBuf], rejectUnauthorized: true };
    } catch (err) {
      console.error('testdb: failed to load DB_SSL_CA:', err && err.message ? err.message : err);
      // fall back to no ssl here so we surface connection errors clearly
      sslOption = false;
    }
  }

  const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
    ssl: sslOption,
  });
  try {
    const r = await pool.query('SELECT 1 as ok');
    console.log('DB test success', r.rows);
  } catch (e) {
    console.error('DB test error', e && e.message ? e.message : e);
  } finally {
    await pool.end();
  }
})();
