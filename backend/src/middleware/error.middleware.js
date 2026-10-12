function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, _req, res, _next) {
  if (error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "File is too large. Please upload a smaller PDF." });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }
  if (error.name === "CastError") {
    return res.status(400).json({ message: "Invalid resource identifier." });
  }
  const status = Number(error.status || 500);
  if (status >= 500) console.error(error);
  res.status(status).json({ message: error.message || "Something went wrong." });
}

module.exports = { notFound, errorHandler };
