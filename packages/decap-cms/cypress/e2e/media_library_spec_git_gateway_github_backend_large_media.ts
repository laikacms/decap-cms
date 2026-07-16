import { entry1 } from './common/entries';
import fixture from './common/media_library';
import * as specUtils from './common/spec_utils';

const backend = 'git-gateway';
const provider = 'github';

describe('Git Gateway (GitHub) Backend Media Library - Large Media', () => {
  const taskResult: { data: TaskDataResult } = { data: {} as TaskDataResult };

  before(() => {
    specUtils.before(taskResult, { publish_mode: 'editorial_workflow', provider }, backend);
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
