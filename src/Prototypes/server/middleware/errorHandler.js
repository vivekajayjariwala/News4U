function notFoundHandler(req, res, next) {
  if (res.headersSent) {
    return next();
  }
  res.status(404).json({ error: "Not found" });
}

function errorHandler(err, req, res, next) {
  console.error("Unhandled error:", err);
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || 500;
  const message =
    status === 500 ? "Internal server error" : err.message || "Request failed";
  res.status(status).json({ error: message });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
