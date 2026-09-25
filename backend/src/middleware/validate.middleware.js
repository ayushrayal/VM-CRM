import { ApiError } from '../utils/ApiError.js';

export const validate = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    next();
  } catch (error) {
    if (error.name === 'ZodError' || error.issues) {
      const issues = error.errors || error.issues || [];
      const formattedErrors = issues.map((err) => ({
        field: err.path ? err.path.join('.').replace(/^(body|query|params)\./, '') : '',
        message: err.message
      }));
      return next(new ApiError(400, 'Validation failed', formattedErrors));
    }
    next(error);
  }
};
