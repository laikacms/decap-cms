import fixture from './common/editorial_workflow';
import { entry1, entry2, entry3 } from './common/entries';
import * as specUtils from './common/spec_utils';

const backend = 'proxy';
const mode = 'git';

describe.skip(`Proxy Backend Editorial Workflow - '${mode}' mode`, () => {
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

  fixture({
    entries: [entry1, entry2, entry3],
    getUser: () => (taskResult.data as TaskDataResult).user,
  });
});
