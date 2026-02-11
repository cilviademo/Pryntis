/**
 * Response-time middleware – sets X-Response-Time header (ms)
 * and logs slow requests (>1 s) to stderr.
 */
function responseTime(req, res, next) {
  const start = process.hrtime.bigint();
  const originalEnd = res.end.bind(res);

  res.end = function (...args) {
    const ns = Number(process.hrtime.bigint() - start);
    const ms = (ns / 1e6).toFixed(2);

    // Only set header if headers haven't been sent yet
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${ms}ms`);
    }

    if (ns > 1e9) {
      // eslint-disable-next-line no-console
      console.warn(`[slow] ${req.method} ${req.originalUrl} ${ms}ms`);
    }

    return originalEnd(...args);
  };

  next();
}

module.exports = { responseTime };
