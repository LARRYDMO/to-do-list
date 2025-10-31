const { Pool } = require('pg');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

// Build pool config and optionally enable SSL if requested via env
const poolConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
};

// To enable SSL for RDS, set DB_SSL=true in your .env.
// For a secure connection that verifies the server certificate, also set DB_SSL_CA to the local path
// of the downloaded RDS CA certificate (PEM). If DB_SSL_CA is not provided we fall back to
// a permissive SSL configuration (rejectUnauthorized: false) which is acceptable for quick local
// testing but NOT recommended for production.
if (process.env.DB_SSL === 'true') {
  try {
    if (process.env.DB_SSL_CA) {
      const path = require('path');
      const tls = require('tls');
      const caPath = path.isAbsolute(process.env.DB_SSL_CA)
        ? process.env.DB_SSL_CA
        : path.resolve(process.cwd(), process.env.DB_SSL_CA);
      console.info(`DB SSL enabled, loading CA from: ${caPath}`);
      const ca = fs.readFileSync(caPath, 'utf8');

      // Use an array for ca and enable strict verification.
      poolConfig.ssl = {
        ca: [ca],
        rejectUnauthorized: true,
        // checkServerIdentity will be invoked during TLS handshake; log cert details then defer to default verification
        checkServerIdentity: (host, cert) => {
          try {
            console.info('Postgres TLS server certificate subject:', cert && cert.subject);
            console.info('Postgres TLS server certificate issuer:', cert && cert.issuer);
          } catch (logErr) {
            console.warn('Failed to log server certificate details:', logErr && logErr.message ? logErr.message : logErr);
          }
          return tls.checkServerIdentity(host, cert);
        },
      };
      console.info('Loaded RDS CA certificate, pem length:', ca.length);

      // TLS diagnostic: attempt a raw TLS connection to the DB host to inspect the server cert and authorization
      (async () => {
        try {
          const host = poolConfig.host;
          const port = poolConfig.port;
          const tlsConnect = require('tls');
          const opts = {
            host,
            port,
            ca: poolConfig.ssl.ca,
            servername: host,
            // do not reject here so we can inspect the peer cert even if unauthorized
            rejectUnauthorized: false,
            timeout: 8000,
          };
          const socket = tlsConnect.connect(opts, () => {
            try {
              console.info('TLS diagnostic connected: authorized=', socket.authorized, 'authorizationError=', socket.authorizationError);
              const peer = socket.getPeerCertificate(true);
              console.info('TLS diagnostic peer cert subject:', peer && peer.subject);
              console.info('TLS diagnostic peer cert issuer:', peer && peer.issuer);
              if (peer && peer.raw) {
                console.info('TLS diagnostic peer cert raw length:', peer.raw.length);
              }
            } catch (diagErr) {
              console.warn('TLS diagnostic error while inspecting peer cert:', diagErr && diagErr.message ? diagErr.message : diagErr);
            }
            socket.end();
          });
          socket.on('error', (err) => {
            console.error('TLS diagnostic connection error:', err && err.message ? err.message : err);
          });
        } catch (e) {
          console.warn('TLS diagnostic failed to run:', e && e.message ? e.message : e);
        }
      })();
    } else {
      console.warn('DB_SSL=true but DB_SSL_CA not set — using insecure fallback (rejectUnauthorized: false)');
      poolConfig.ssl = { rejectUnauthorized: false };
    }
  } catch (e) {
    // If CA read fails, fall back to permissive mode but log the error for debugging
    console.error('Failed to load DB_SSL_CA:', e && e.message ? e.message : e);
    console.warn('Falling back to insecure SSL configuration (rejectUnauthorized: false).');
    poolConfig.ssl = { rejectUnauthorized: false };
  }
}

// Dump a short summary of final pool configuration (without sensitive values)
// Provide a bit more detail about SSL for easier debugging (but don't print secrets)
const sslInfo = poolConfig.ssl
  ? {
      hasCa: !!poolConfig.ssl.ca,
      caLength: poolConfig.ssl.ca ? poolConfig.ssl.ca.length : undefined,
      rejectUnauthorized: typeof poolConfig.ssl.rejectUnauthorized === 'boolean' ? poolConfig.ssl.rejectUnauthorized : undefined,
    }
  : false;

console.info('Postgres pool config:', {
  host: poolConfig.host,
  port: poolConfig.port,
  database: poolConfig.database,
  user: poolConfig.user,
  ssl: sslInfo,
});

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle Postgres client', err);
  process.exit(-1);
});

async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  // simple perf logging
  console.debug('query', { text, duration, rows: res.rowCount });
  return res;
}

module.exports = {
  query,
  pool,
};
