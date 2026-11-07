export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // Malformed JSON body
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      message: "Invalid JSON body",
    });
  }

  // Multer limit file size
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      message: "File is too large. Maximum size is 5 MB.",
    });
  }

  // Other Multer errors
  if (err.name === "MulterError") {
    return res.status(400).json({
      message: err.message || "Invalid file upload",
    });
  }

  // File type errors from upload filter
  if (err.name === "InvalidFileTypeError") {
    return res.status(400).json({
      message: err.message,
    });
  }

  // Payload too large
  if (err.type === "entity.too.large" || err.status === 413) {
    return res.status(413).json({
      message: "Request body too large",
    });
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    const errors = {};
    for (const [key, errorObj] of Object.entries(err.errors || {})) {
      const field = key.replace(/^replies\.\d+\./, "");
      errors[field] = errorObj.message;
    }
    return res.status(400).json({
      message: "Validation failed",
      errors,
    });
  }

  // Mongoose CastError
  if (err.name === "CastError") {
    return res.status(400).json({
      message: `Invalid ${err.path || "id"}`,
    });
  }

  // Mongo duplicate key error
  if (
    err.code === 11000 ||
    (err.name === "MongoServerError" && err.code === 11000)
  ) {
    return res.status(409).json({
      message: "Already exists",
    });
  }

  // Unexpected / 500 errors
  const status = err.status || 500;
  if (status >= 500) {
    console.error(`[500] ${req.method} ${req.originalUrl}:`, err);
  }

  const response = { message: "Something went wrong" };
  if (process.env.NODE_ENV !== "production") {
    response.error = err.message;
    response.stack = err.stack;
  }

  return res.status(status).json(response);
};

export default errorHandler;
