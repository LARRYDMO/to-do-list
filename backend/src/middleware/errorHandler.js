function errorHandler(err, req, res, next) { // eslint-disable-line
  console.error(err && err.stack ? err.stack : err);
  const status = err && err.status ? err.status : 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
}

module.exports = errorHandler;
