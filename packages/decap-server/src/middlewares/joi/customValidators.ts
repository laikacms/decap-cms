import Joi from '@hapi/joi';
import path from 'path';

export function pathTraversal(repoPath: string) {
  return Joi.extend({
    type: 'path',
    base: Joi.string().required(),
    messages: {
      'path.invalid': '{{#label}} must resolve to a path under the configured repository',
    },
    validate(value, helpers) {
      const resolvedPath = path.join(repoPath, value);
      const normalizedRepo = repoPath.endsWith(path.sep) ? repoPath : repoPath + path.sep;
      if (!resolvedPath.startsWith(normalizedRepo) && resolvedPath !== repoPath) {
        return { value, errors: helpers.error('path.invalid') };
      }
    },
  }).path();
}
