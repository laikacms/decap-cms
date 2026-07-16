// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add("login", (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add("drag", { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add("dismiss", { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This is will overwrite an existing command --
// Cypress.Commands.overwrite("visit", (originalFn, url, options) => { ... })
/// <reference types="cypress" />
import type {} from './index.d';

import path from 'path';

import { escapeRegExp } from '../utils/regexp';

interface Route {
  url: string;
  method: string;
  status: number;
  headers: Record<string, string>;
  body?: {
    encoding?: string,
    content?: string,
    contentType?: string,
  } | string;
  response?: {
    encoding?: string,
    content?: string,
  } | string;
}

interface FetchOptions {
  method?: string;
  body?: Blob | FormData | string;
}

const matchRoute = (route: Route, fetchArgs: [string, FetchOptions?]): boolean => {
  const url = fetchArgs[0];
  const options = fetchArgs[1];

  const method = options && options.method ? options.method : 'GET';
  const body = options && options.body;
  const routeBody = route.body;

  let bodyMatch: boolean;
  if (
    typeof routeBody === 'object' && routeBody?.encoding === 'base64' && body
    && ['File', 'Blob'].includes(body?.constructor.name)
  ) {
    const blob = new Blob([Buffer.from(routeBody.content || '', 'base64')], {
      type: routeBody.contentType,
    });
    // size matching is good enough
    bodyMatch = blob.size === (body as Blob).size;
  } else if (routeBody && body?.constructor.name === 'FormData') {
    bodyMatch = Array.from((body as FormData).entries()).some(([key, value]) => {
      const val = typeof value === 'string' ? value : '';
      const routeBodyStr = typeof routeBody === 'string' ? routeBody : JSON.stringify(routeBody);
      const match = routeBodyStr.includes(key) && routeBodyStr.includes(val);
      return match;
    });
  } else {
    bodyMatch = body === routeBody;
  }

  // use pattern matching for the timestamp parameter
  const urlRegex = escapeRegExp(decodeURIComponent(route.url)).replace(
    /ts=\d{1,15}/,
    'ts=\\d{1,15}',
  );

  return (
    method === route.method && bodyMatch && !!decodeURIComponent(url).match(new RegExp(`${urlRegex}`))
  );
};

interface FetchResponse {
  status: number;
  headers: Headers;
  blob: () => Promise<Blob>;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
  ok: boolean;
}

const stubFetch = (win: Window, routes: Route[]): void => {
  const fetch = win.fetch;
  cy.stub(win, 'fetch').callsFake((...args: [string, FetchOptions?]) => {
    let routeIndex = routes.findIndex(r => matchRoute(r, args));
    if (routeIndex >= 0) {
      let route = routes.splice(routeIndex, 1)[0];
      const message = `matched ${args[0]} to ${route.url} ${route.method} ${route.status}`;
      console.log(message);
      if (route.status === 302) {
        console.log(`resolving redirect to ${route.headers.Location}`);
        routeIndex = routes.findIndex(r => matchRoute(r, [route.headers.Location]));
        route = routes.splice(routeIndex, 1)[0];
      }

      let blob: Blob;
      if (route.response && typeof route.response === 'object' && route.response.encoding === 'base64') {
        const buffer = Buffer.from(route.response.content || '', 'base64');
        blob = new Blob([buffer]);
      } else {
        const responseStr = typeof route.response === 'string' ? route.response : '';
        blob = new Blob([responseStr]);
      }
      const fetchResponse: FetchResponse = {
        status: route.status,
        headers: new Headers(route.headers),
        blob: () => Promise.resolve(blob),
        text: () =>
          Promise.resolve(typeof route.response === 'string' ? route.response : JSON.stringify(route.response)),
        json: () =>
          Promise.resolve(
            JSON.parse(typeof route.response === 'string' ? route.response : JSON.stringify(route.response)),
          ),
        ok: route.status >= 200 && route.status <= 299,
      };
      return Promise.resolve(fetchResponse);
    } else if (
      args[0].includes('api.github.com')
      || args[0].includes('api.bitbucket.org')
      || args[0].includes('bitbucket.org')
      || args[0].includes('api.media.atlassian.com')
      || args[0].includes('gitlab.com')
      || args[0].includes('netlify.com')
      || args[0].includes('s3.amazonaws.com')
    ) {
      console.warn(
        `No route match for api request. Fetch args: ${JSON.stringify(args)}. Returning 404`,
      );
      const fetchResponse: FetchResponse = {
        status: 404,
        headers: new Headers(),
        blob: () => Promise.resolve(new Blob(['{}'])),
        text: () => Promise.resolve('{}'),
        json: () => Promise.resolve({}),
        ok: false,
      };
      return Promise.resolve(fetchResponse);
    } else {
      console.log(`No route match for fetch args: ${JSON.stringify(args)}`);
      return fetch(...args);
    }
  });
};

Cypress.Commands.add('stubFetch', ({ fixture }: { fixture: string }) => {
  return cy.readFile(path.join('cypress', 'fixtures', fixture), { log: false }).then((routes: Route[]) => {
    cy.on('window:before:load', win => stubFetch(win, routes));
  });
});

function runTimes<T>(cyInstance: T, fn: (chain: T) => T, count = 1): T {
  let chain = cyInstance;
  let i = count;
  while (i) {
    i -= 1;
    chain = fn(chain);
  }
  return chain;
}

type KeyCommand = string | [string, string];

const keyCommands: KeyCommand[] = [
  'enter',
  'backspace',
  ['selectAll', 'selectall'],
  ['up', 'upArrow'],
  ['down', 'downArrow'],
  ['left', 'leftArrow'],
  ['right', 'rightArrow'],
];

keyCommands.forEach(key => {
  const [cmd, keyName] = typeof key === 'object' ? key : [key, key];
  Cypress.Commands.add(
    cmd as keyof Cypress.Chainable,
    { prevSubject: true },
    (subject: JQuery<HTMLElement>, { shift, times = 1 }: { shift?: boolean, times?: number } = {}) => {
      const fn = (chain: Cypress.Chainable<JQuery<HTMLElement>>) =>
        chain.type(`${shift ? '{shift}' : ''}{${keyName}}`, { delay: 50 });
      return runTimes(cy.wrap(subject), fn, times);
    },
  );
});

// Convert `tab` command from plugin to a child command with `times` support
Cypress.Commands.add(
  'tabkey',
  { prevSubject: true },
  (subject: JQuery<HTMLElement>, { shift, times }: { shift?: boolean, times?: number } = {}) => {
    const fn = (chain: Cypress.Chainable) => chain.tab({ shift });
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(100);
    return runTimes(cy, fn, times).wrap(subject);
  },
);

Cypress.Commands.add(
  'selection',
  { prevSubject: true },
  (subject: JQuery<HTMLElement>, fn: ($el: JQuery<HTMLElement>) => void) => {
    cy.wrap(subject)
      .trigger('mousedown')
      .then(fn)
      .trigger('mouseup');

    cy.document().trigger('selectionchange');
    return cy.wrap(subject);
  },
);

Cypress.Commands.add('print', { prevSubject: 'optional' }, (subject: JQuery<HTMLElement> | undefined, str: string) => {
  cy.log(str);
  console.log(`cy.log: ${str}`);
  return cy.wrap(subject);
});

interface SelectionQuery {
  anchorQuery: string;
  anchorOffset?: number;
  focusQuery?: string;
  focusOffset?: number;
}

Cypress.Commands.add(
  'setSelection',
  { prevSubject: true },
  (subject: JQuery<HTMLElement>, query: string | SelectionQuery, endQuery?: string) => {
    return cy.wrap(subject).selection($el => {
      if (typeof query === 'string') {
        const anchorNode = getTextNode($el[0], query);
        const focusNode = endQuery ? getTextNode($el[0], endQuery) : anchorNode;
        if (anchorNode && focusNode) {
          const anchorOffset = anchorNode.wholeText.indexOf(query);
          const focusOffset = endQuery
            ? focusNode.wholeText.indexOf(endQuery) + endQuery.length
            : anchorOffset + query.length;
          setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
        }
      } else if (typeof query === 'object') {
        const el = $el[0];
        const anchorNode = getTextNode(el.querySelector(query.anchorQuery) as HTMLElement);
        const anchorOffset = query.anchorOffset || 0;
        const focusNode = query.focusQuery
          ? getTextNode(el.querySelector(query.focusQuery) as HTMLElement)
          : anchorNode;
        const focusOffset = query.focusOffset || 0;
        if (anchorNode && focusNode) {
          setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
        }
      }
    });
  },
);

Cypress.Commands.add(
  'setCursor',
  { prevSubject: true },
  (subject: JQuery<HTMLElement>, query: string, atStart?: boolean) => {
    return cy.wrap(subject).selection($el => {
      const node = getTextNode($el[0], query);
      if (node) {
        const offset = node.wholeText.indexOf(query) + (atStart ? 0 : query.length);
        const document = node.ownerDocument;
        document.getSelection()?.removeAllRanges();
        document.getSelection()?.collapse(node, offset);
      }
    });
  },
);

Cypress.Commands.add('setCursorBefore', { prevSubject: true }, (subject: JQuery<HTMLElement>, query: string) => {
  cy.wrap(subject).setCursor(query, true);
});

Cypress.Commands.add('setCursorAfter', { prevSubject: true }, (subject: JQuery<HTMLElement>, query: string) => {
  cy.wrap(subject).setCursor(query);
});

Cypress.Commands.add('login', () => {
  cy.viewport(1200, 1200);
  cy.visit('/');
  cy.contains('button', 'Login').click();
});

Cypress.Commands.add('loginAndNewPost', () => {
  cy.login();
  cy.contains('a', 'New Post').click();
});

Cypress.Commands.add('drag', { prevSubject: true }, (subject: JQuery<HTMLElement>) => {
  return cy.wrap(subject).trigger('dragstart', {
    dataTransfer: {},
    force: true,
  });
});

Cypress.Commands.add('drop', { prevSubject: true }, (subject: JQuery<HTMLElement>) => {
  return cy.wrap(subject).trigger('drop', {
    dataTransfer: {},
    force: true,
  });
});

function getTextNode(el: HTMLElement | null, match?: string): Text | null {
  if (!el) return null;
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
  if (!match) {
    return walk.nextNode() as Text | null;
  }

  let node: Text | null;
  while ((node = walk.nextNode() as Text | null)) {
    if (node.wholeText.includes(match)) {
      return node;
    }
  }
  return null;
}

function setBaseAndExtent(anchorNode: Text, anchorOffset: number, focusNode: Text, focusOffset: number): void {
  const document = anchorNode.ownerDocument;
  document.getSelection()?.removeAllRanges();
  document.getSelection()?.setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset);
}
