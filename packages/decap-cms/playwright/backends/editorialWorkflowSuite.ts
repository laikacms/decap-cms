import {
  assertEntryDeleted,
  assertOnCollectionsPage,
  assertPublishedEntry,
  assertWorkflowStatus,
  assertWorkflowStatusInEditor,
  createPost,
  createPostAndExit,
  deleteEntryInEditor,
  editorStatus,
  exitEditor,
  goToCollections,
  goToWorkflow,
  login,
  loginNetlify,
  publishWorkflowEntry,
  test,
  updateExistingPostAndExit,
  updateWorkflowStatus,
  updateWorkflowStatusInEditor,
  workflowStatus,
} from './steps';

import type { Page } from '@playwright/test';
import type { ReplayHandle } from './replay';
import type { Entry } from './steps';

/**
 * The editorial workflow suite shared by every recorded backend — the
 * Playwright port of the retired Cypress editorial workflow suite. Each backend
 * spec instantiates it with its page and recorded identity; the describe
 * `title` must match the fixture filename prefix
 * (`<title>__<test title>.json` in `playwright/fixtures/`).
 */
export interface EditorialWorkflowSuiteOptions {
  /** Describe title == fixture filename prefix. */
  title: string;
  /** The dev-test page for the backend (trailing slash, see steps.ts). */
  pageUrl: string;
  /** Seeded `decap-cms-user`; omit for form-based logins. */
  user?: Record<string, unknown>;
  /** Git-gateway: seeded site URL + Identity form credentials. */
  netlifySiteURL?: string;
  credentials?: { email: string, password: string };
  /** Test titles to skip, mapped to the reason. */
  skips?: Record<string, string>;
}

const entry1: Entry = {
  title: 'first title',
  body: 'first body',
  description: 'first description',
  category: 'first category',
  tags: 'tag1',
};

const entry2: Entry = {
  title: 'second title',
  body: 'second body',
  description: 'second description',
  category: 'second category',
  tags: 'tag2',
};

const entry3: Entry = {
  title: 'third title',
  body: 'third body',
  description: 'third description',
  category: 'third category',
  tags: 'tag3',
};

export function editorialWorkflowSuite(options: EditorialWorkflowSuiteOptions): void {
  const { title, pageUrl, user, netlifySiteURL, credentials, skips = {} } = options;

  async function doLogin(page: Page): Promise<void> {
    if (credentials) {
      await loginNetlify(page, pageUrl, credentials.email, credentials.password);
    } else {
      await login(page, pageUrl);
    }
  }

  // `skips` reasons are documented at the call site (test.skip has no
  // reason parameter for the declaration form).
  function defineTest(
    testTitle: string,
    body: (fixtures: { page: Page, replay: ReplayHandle }) => Promise<void>,
  ): void {
    if (skips[testTitle]) {
      test.skip(testTitle, body);
    } else {
      test(testTitle, body);
    }
  }

  test.describe(title, () => {
    test.use({
      backendUser: user ?? null,
      backendPage: pageUrl,
      netlifySiteURL: netlifySiteURL ?? null,
    });

    defineTest('successfully loads', async ({ page, replay }) => {
      void replay;
      await doLogin(page);
    });

    defineTest('can create an entry', async ({ page, replay }) => {
      void replay;
      await doLogin(page);
      await createPostAndExit(page, entry1);
    });

    defineTest('can update an entry', async ({ page, replay }) => {
      void replay;
      await doLogin(page);
      await createPostAndExit(page, entry1);
      await updateExistingPostAndExit(page, entry1, entry2);
    });

    defineTest('can publish an editorial workflow entry', async ({ page, replay }) => {
      void replay;
      await doLogin(page);
      await createPostAndExit(page, entry1);
      await goToWorkflow(page);
      await updateWorkflowStatus(page, entry1, workflowStatus.draft, workflowStatus.ready);
      await publishWorkflowEntry(page, entry1);
    });

    defineTest('can change workflow status', async ({ page, replay }) => {
      void replay;
      await doLogin(page);
      await createPostAndExit(page, entry1);
      await goToWorkflow(page);
      await updateWorkflowStatus(page, entry1, workflowStatus.draft, workflowStatus.review);
      await updateWorkflowStatus(page, entry1, workflowStatus.review, workflowStatus.ready);
      await updateWorkflowStatus(page, entry1, workflowStatus.ready, workflowStatus.review);
      await updateWorkflowStatus(page, entry1, workflowStatus.review, workflowStatus.draft);
      await updateWorkflowStatus(page, entry1, workflowStatus.draft, workflowStatus.ready);
    });

    defineTest('can change status on and publish multiple entries', async ({ page, replay }) => {
      void replay;
      await doLogin(page);
      await createPostAndExit(page, entry1);
      await createPostAndExit(page, entry2);
      await createPostAndExit(page, entry3);
      await goToWorkflow(page);
      await updateWorkflowStatus(page, entry3, workflowStatus.draft, workflowStatus.ready);
      await updateWorkflowStatus(page, entry2, workflowStatus.draft, workflowStatus.ready);
      await updateWorkflowStatus(page, entry1, workflowStatus.draft, workflowStatus.ready);
      await publishWorkflowEntry(page, entry3);
      await publishWorkflowEntry(page, entry2);
      await publishWorkflowEntry(page, entry1);
      await goToCollections(page);
      await assertPublishedEntry(page, [entry3, entry2, entry1]);
    });

    defineTest('can delete an entry', async ({ page, replay }) => {
      void replay;
      await doLogin(page);
      await createPost(page, entry1);
      await deleteEntryInEditor(page);
      await assertOnCollectionsPage(page);
      await assertEntryDeleted(page, entry1);
    });

    defineTest('can update workflow status from within the editor', async ({ page, replay }) => {
      void replay;
      await doLogin(page);
      await createPost(page, entry1);
      await assertWorkflowStatusInEditor(page, editorStatus.draft);
      await updateWorkflowStatusInEditor(page, editorStatus.review);
      await assertWorkflowStatusInEditor(page, editorStatus.review);
      await updateWorkflowStatusInEditor(page, editorStatus.ready);
      await assertWorkflowStatusInEditor(page, editorStatus.ready);
      await exitEditor(page);
      await goToWorkflow(page);
      await assertWorkflowStatus(page, entry1, workflowStatus.ready);
    });
  });
}
