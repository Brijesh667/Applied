export const validateQuery = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.query);

  if (!result.success) {
    const errors = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join(".") || "query";
      if (!errors[field]) {
        errors[field] = issue.message;
      }
    }
    const rootIssue = result.error.issues.find((i) => i.path.length === 0);
    const message = rootIssue ? rootIssue.message : "Validation failed";

    return res.status(400).json({
      message,
      errors,
    });
  }

  req.validatedQuery = result.data;
  next();
};

export default validateQuery;
