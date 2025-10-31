const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;

async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await db.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, hashed]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err && err.code === '23505') { // unique_violation
      return res.status(409).json({ error: 'Email already exists' });
    }
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const result = await db.query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const payload = { sub: user.id, email: user.email };
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '7d' });
    return res.json({ token });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login };
