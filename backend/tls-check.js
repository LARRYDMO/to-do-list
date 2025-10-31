const fs = require('fs');
const tls = require('tls');
const path = require('path');
require('dotenv').config({ path: __dirname + '/.env' });

const host = process.env.DB_HOST;
const port = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432;
const raw = process.env.DB_SSL_CA || '';
const caPath = path.isAbsolute(raw) ? raw : path.resolve(__dirname, raw || '');
console.log('tls-check: CA path ->', caPath);
let caBuf;
try {
  caBuf = fs.readFileSync(caPath);
  console.log('tls-check: loaded CA, bytes=', caBuf.length);
} catch (e) {
  console.error('tls-check: failed to read CA:', e && e.message);
  process.exit(1);
}

function inspect(connectOpts, label) {
  console.log('---', label, '---');
  const s = tls.connect(connectOpts, () => {
    console.log(label, 'connected: authorized=', s.authorized, 'authorizationError=', s.authorizationError);
    try {
      const peer = s.getPeerCertificate(true);
      console.log(label, 'peer subject=', peer && peer.subject);
      console.log(label, 'peer issuer=', peer && peer.issuer);
      if (peer && peer.raw) console.log(label, 'peer raw length=', peer.raw.length);
    } catch (e) {
      console.warn(label, 'inspect error', e && e.message);
    }
    s.end();
  });
  s.on('error', (err) => {
    console.error(label, 'socket error:', err && err.message);
  });
}

inspect({ host, port, ca: [caBuf], servername: host, rejectUnauthorized: false }, 'no-reject');
// Wait a bit and then try strict verification
setTimeout(() => {
  inspect({ host, port, ca: [caBuf], servername: host, rejectUnauthorized: true }, 'reject');
}, 1500);
