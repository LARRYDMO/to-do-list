const express = require('express');
const morgan = require('morgan');
const dotenv = require('dotenv');

dotenv.config();

const taskRoutes = require('./routes/taskRoutes');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(express.json());
app.use(morgan('dev'));

app.use('/tasks', taskRoutes);
app.use('/auth', authRoutes);

// Backward-compatible API prefix so both /auth and /api/auth work
const api = express.Router();
api.use('/tasks', taskRoutes);
api.use('/auth', authRoutes);
app.use('/api', api);

app.get('/', (req, res) => res.json({ ok: true }));

// centralized error handler
app.use(errorHandler);

module.exports = app;
