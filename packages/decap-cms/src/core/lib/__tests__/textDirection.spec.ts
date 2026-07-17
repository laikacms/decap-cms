import { afterEach, describe, expect, it } from 'vitest';

import { detectTextDirection } from '@/core/lib/textDirection';

describe('detectTextDirection', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir');
    document.head.querySelectorAll('style[data-test-direction]').forEach(node => node.remove());
    document.body.innerHTML = '';
  });

  it('defaults to ltr when the host page declares no direction', () => {
    expect(detectTextDirection()).toBe('ltr');
  });

  it('detects dir="rtl" on the document element', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    expect(detectTextDirection()).toBe('rtl');
  });

  it('is case-insensitive for the dir attribute', () => {
    document.documentElement.setAttribute('dir', 'RTL');
    expect(detectTextDirection()).toBe('rtl');
  });

  it('detects dir="rtl" set directly on the target element', () => {
    document.body.innerHTML = '<section id="mount" dir="rtl"></section>';
    const mount = document.getElementById('mount') as HTMLElement;
    expect(detectTextDirection(mount)).toBe('rtl');
  });

  it('detects dir="ltr" set directly on the target element', () => {
    document.body.innerHTML = '<section id="mount" dir="ltr"></section>';
    const mount = document.getElementById('mount') as HTMLElement;
    expect(detectTextDirection(mount)).toBe('ltr');
  });

  it('resolves the nearest ancestor dir attribute for a nested element', () => {
    document.documentElement.setAttribute('dir', 'rtl');
    document.body.innerHTML = '<div dir="ltr"><section id="mount"></section></div>';
    const mount = document.getElementById('mount') as HTMLElement;
    expect(detectTextDirection(mount)).toBe('ltr');
  });

  it('falls back to ltr for dir="auto"', () => {
    document.documentElement.setAttribute('dir', 'auto');
    expect(detectTextDirection()).toBe('ltr');
  });

  it('falls through an invalid dir value to the computed CSS direction check', () => {
    document.body.innerHTML = `
      <style data-test-direction>#mount { direction: rtl; }</style>
      <section id="mount" dir="garbage"></section>
    `;
    const mount = document.getElementById('mount') as HTMLElement;
    expect(detectTextDirection(mount)).toBe('rtl');
  });

  it('detects computed CSS direction: rtl from a stylesheet with no dir attribute', () => {
    document.body.innerHTML = `
      <style data-test-direction>#mount { direction: rtl; }</style>
      <section id="mount"></section>
    `;
    const mount = document.getElementById('mount') as HTMLElement;
    expect(detectTextDirection(mount)).toBe('rtl');
  });
});
