interface TaskResult {
  data: TaskDataResult;
}

export function before(taskResult: TaskResult, options: Record<string, unknown>, backend: string): void {
  console.log(`[spec_utils.before] START backend=${backend}`);
  Cypress.config('taskTimeout', 5 * 60 * 1000); // 5 minutes
  cy.task('setupBackend', { backend, options }).then((data: TaskDataResult) => {
    console.log('[spec_utils.before] setupBackend completed, data=', data);
    taskResult.data = data;
    Cypress.config('defaultCommandTimeout', data.mockResponses ? 5 * 1000 : 1 * 60 * 1000);
    console.log(
      `[spec_utils.before] COMPLETE mockResponses=${data.mockResponses} timeout=${data.mockResponses ? 5000 : 60000}ms`,
    );
  });
}

export function after(taskResult: TaskResult, backend: string): void {
  console.log(`[spec_utils.after] START backend=${backend}`);
  cy.task('teardownBackend', {
    backend,
    ...taskResult.data,
  }).then(() => {
    console.log('[spec_utils.after] COMPLETE');
  });
}

export function beforeEach(taskResult: TaskResult, backend: string): Cypress.Chainable | void {
  const runner = Cypress.mocha.getRunner();
  const ctx = runner.suite.ctx || runner.ctx;
  const spec = ctx?.currentTest?.parent?.title || '';
  const testName = ctx?.currentTest?.title || '';

  console.log(`[spec_utils.beforeEach] START backend=${backend} spec="${spec}" test="${testName}"`);
  console.log(`[spec_utils.beforeEach] mockResponses=${(taskResult.data as TaskDataResult).mockResponses}`);
  console.log(`[spec_utils.beforeEach] user=`, JSON.stringify((taskResult.data as TaskDataResult).user || {}));

  cy.task('setupBackendTest', {
    backend,
    ...taskResult.data,
    spec,
    testName,
  }).then(() => {
    console.log('[spec_utils.beforeEach] setupBackendTest completed');
  });

  if ((taskResult.data as TaskDataResult).mockResponses) {
    const fixture = `${spec}__${testName}.json`;
    console.log(`[spec_utils.beforeEach] Loading fixture: ${fixture}`);
    cy.stubFetch({ fixture }).then(() => {
      console.log('[spec_utils.beforeEach] stubFetch completed');
    });
  } else {
    console.log('[spec_utils.beforeEach] WARNING: mockResponses is false/undefined - no fixture loaded');
  }

  // cy.clock(0, ['Date']) was hanging git-gateway tests after page load
  // Hypothesis: freezing time to 0 breaks app initialization during cy.visit()
  // Temporary fix: skip cy.clock for git-gateway, use default clock for others
  if (backend !== 'git-gateway') {
    console.log('[spec_utils.beforeEach] Setting clock to epoch 0');
    return cy.clock(0, ['Date']);
  }

  console.log('[spec_utils.beforeEach] COMPLETE - skipped clock for git-gateway');
}

export function afterEach(taskResult: TaskResult, backend: string): void {
  const runner = Cypress.mocha.getRunner();
  const ctx = runner.suite.ctx || runner.ctx;
  const spec = ctx?.currentTest?.parent?.title || '';
  const testName = ctx?.currentTest?.title || '';

  cy.task('teardownBackendTest', {
    backend,
    ...taskResult.data,
    spec,
    testName,
  });

  if (!process.env.RECORD_FIXTURES) {
    const currentTest = ctx?.currentTest as { state?: string, _retries?: number, _currentRetry?: number } | undefined;
    const state = currentTest?.state;
    const retries = currentTest?._retries ?? 0;
    const currentRetry = currentTest?._currentRetry ?? 0;

    if (state === 'failed' && retries === currentRetry) {
      Cypress.runner.stop();
    }
  }
}

export function seedRepo(taskResult: TaskResult, backend: string): void {
  cy.task('seedRepo', {
    backend,
    ...taskResult.data,
  });
}
