import { entry1, entry2, entry3 } from './common/entries';
import fixture from './common/simple_workflow';
import * as specUtils from './common/spec_utils';

const backend = 'proxy';
const mode = 'git';

describe(`Proxy Backend Simple Workflow - '${mode}' mode`, () => {
  const taskResult: { data: TaskDataResult } = { data: {} as TaskDataResult };

  before(() => {
    specUtils.before(taskResult, { publish_mode: 'simple', mode }, backend);
    Cypress.config('defaultCommandTimeout', 5 * 1000);
  });

  after(() => {
    specUtils.after(taskResult, backend);
  });

  beforeEach(() => {
    if ((Cypress.mocha.getRunner().suite.ctx?.currentTest?.title || '') === 'can create an entry') {
      Cypress.mocha.getRunner().suite.ctx.currentTest.skip();
    }
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
