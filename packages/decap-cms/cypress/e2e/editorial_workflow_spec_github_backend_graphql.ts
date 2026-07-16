import fixture from './common/editorial_workflow';
import { entry1, entry2, entry3 } from './common/entries';
import * as specUtils from './common/spec_utils';

const backend = 'github';

describe('GitHub Backend Editorial Workflow - GraphQL API', () => {
  const taskResult: { data: TaskDataResult } = { data: {} as TaskDataResult };

  before(() => {
    specUtils.before(
      taskResult,
      {
        backend: { use_graphql: true, open_authoring: false },
        publish_mode: 'editorial_workflow',
      },
      backend,
    );
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
