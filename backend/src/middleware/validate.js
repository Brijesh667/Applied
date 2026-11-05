export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = {};
    for (const issue of result.error.issues) {
      const field = issue.path.join(".") || "body";
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

  req.body = result.data;
  next();
};

export default validate;
