import { entry1 } from './common/entries';
import fixture from './common/media_library';
import * as specUtils from './common/spec_utils';

const backend = 'proxy';
const mode = 'git';

describe(`Proxy Backend Media Library - '${mode}' mode`, () => {
  const taskResult: { data: TaskDataResult } = { data: {} as TaskDataResult };

  before(() => {
    specUtils.before(taskResult, { publish_mode: 'editorial_workflow', mode }, backend);
    Cypress.config('defaultCommandTimeout', 5 * 1000);
  });

  after(() => {
    specUtils.after(taskResult, backend);
  });

  beforeEach(() => {
    specUtils.beforeEach(taskResult, backend);
  });

  afterEach(() => {
    specUtils.afterEach(taskResult, backend);
  });

  fixture({ entries: [entry1], getUser: () => (taskResult.data as TaskDataResult).user });
});
