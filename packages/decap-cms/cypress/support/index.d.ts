/// <reference types="cypress" />

// Global type for task data results
declare global {
  interface TaskDataResult {
    user?: {
      login?: string,
      name?: string,
      token?: string,
      backendName?: string,
      netlifySiteURL?: string,
      email?: string,
      password?: string,
      [key: string]: unknown,
    };
    forkUser?: {
      login?: string,
      name?: string,
      token?: string,
      backendName?: string,
      [key: string]: unknown,
    };
    mockResponses?: boolean;
    owner?: string;
    repo?: string;
    tempDir?: string;
    [key: string]: unknown;
  }

  // Clock type for Cypress
  interface Clock {
    tick(ms: number): void;
    restore(): void;
  }

  // Window with clock
  interface Window {
    clock?: Clock;
  }

  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to stub fetch requests with fixture data
       */
      stubFetch(options: { fixture: string }): Chainable<void>;

      /**
       * Custom command to login
       */
      login(): Chainable<void>;

      /**
       * Custom command to login and create new post
       */
      loginAndNewPost(): Chainable<void>;

      /**
       * Custom command to drag an element
       */
      drag(): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to drop on an element
       */
      drop(): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to press enter key
       */
      enter(options?: { shift?: boolean, times?: number }): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to press backspace key
       */
      backspace(options?: { shift?: boolean, times?: number }): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to select all
       */
      selectAll(options?: { shift?: boolean, times?: number }): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to press up arrow
       */
      up(options?: { shift?: boolean, times?: number }): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to press down arrow
       */
      down(options?: { shift?: boolean, times?: number }): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to press left arrow
       */
      left(options?: { shift?: boolean, times?: number }): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to press right arrow
       */
      right(options?: { shift?: boolean, times?: number }): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to press tab key
       */
      tabkey(options?: { shift?: boolean, times?: number }): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to make a selection
       */
      selection(fn: ($el: JQuery<HTMLElement>) => void): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to print/log
       */
      print(str: string): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to set selection
       */
      setSelection(
        query: string | { anchorQuery: string, anchorOffset?: number, focusQuery?: string, focusOffset?: number },
        endQuery?: string,
      ): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to set cursor
       */
      setCursor(query: string, atStart?: boolean): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to set cursor before text
       */
      setCursorBefore(query: string): Chainable<JQuery<HTMLElement>>;

      /**
       * Custom command to set cursor after text
       */
      setCursorAfter(query: string): Chainable<JQuery<HTMLElement>>;

      /**
       * Access internal Cypress state
       */
      state(key: string): unknown;
    }

    interface cy {
      /**
       * Access internal Cypress state
       */
      state(key: 'window'): Window | undefined;
      state(key: 'clock'): Clock | undefined;
      state(key: string): unknown;
    }

    // Extend Cypress namespace for internal properties
    interface Cypress {
      /**
       * Access internal Cypress state
       */
      state(key: 'window'): Window | undefined;
      state(key: 'clock'): Clock | undefined;
      state(key: string): unknown;

      /**
       * Access mocha instance
       */
      mocha: {
        getRunner(): {
          suite: {
            suites: Array<{ title: string }>,
            ctx?: {
              currentTest?: {
                title: string,
                skip(): void,
                parent?: {
                  title: string,
                },
              },
            },
          },
          ctx?: {
            currentTest?: {
              title: string,
              skip(): void,
              parent?: {
                title: string,
              },
            },
          },
        },
      };

      /**
       * Access runner instance
       */
      runner: {
        stop(): void,
      };
    }
  }
}

export {};
