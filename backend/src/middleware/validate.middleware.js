import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ApiError } from '../utils/ApiError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFile = path.resolve(__dirname, '../../validation-debug.log');

export const validate = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (parsed.body) req.body = parsed.body;
    if (parsed.query && req.query) {
      try {
        req.query = parsed.query;
      } catch {
        // Express 5 query getter fallback
        Object.keys(req.query).forEach((key) => delete req.query[key]);
        Object.assign(req.query, parsed.query);
      }
    }
    if (parsed.params && req.params) {
      try {
        req.params = parsed.params;
      } catch {
        Object.assign(req.params, parsed.params);
      }
    }

    next();
  } catch (error) {
    if (error.name === 'ZodError' || error.issues) {
      const issues = error.errors || error.issues || [];
      const formattedErrors = issues.map((err) => ({
        field: err.path ? err.path.join('.').replace(/^(body|query|params)\./, '') : '',
        message: err.message
      }));
      console.error(`[Validation Failed] ${req.method} ${req.originalUrl}`);
      console.error('  Fields:', Object.keys(req.body || {}));
      console.error('  Formatted errors:', JSON.stringify(formattedErrors));

      try {
        const entry = `[${new Date().toISOString()}] VALIDATION FAILED: ${req.method} ${req.originalUrl}\nErrors: ${JSON.stringify(formattedErrors, null, 2)}\nBody: ${JSON.stringify(req.body, null, 2)}\n\n`;
        fs.appendFileSync(logFile, entry);
      } catch (logErr) {}

      return next(new ApiError(400, 'Validation failed', formattedErrors));
    }
    next(error);
  }
};
