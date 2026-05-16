import { ApiError } from '../utils/ApiError.js';

export const validate = (schema, source = 'body') => (req, _res, next) => {
  const data = req[source];
  const result = schema.safeParse(data);
  if (!result.success) {
    return next(
      ApiError.badRequest(
        'Validation failed',
        result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }))
      )
    );
  }
  req[source] = result.data;
  next();
};
