import { expect, it } from 'vitest';

import { nativeStylesheetHmr } from './native-stylesheet-hmr';

it('creates a scoped stylesheet HMR bridge', () => {
  const source = nativeStylesheetHmr('assets/cssx.css', 'revision-a');

  expect(source).toContain('endsWith("/assets/cssx.css")');
  expect(source).toContain('__cssxStylesheetHmr');
  expect(source).toContain('module.hot.addStatusHandler');
  expect(source).toContain('webpackHotUpdate');
  expect(source).toContain('CSSX development stylesheet revision: revision-a');
  expect(source).not.toContain('setInterval');
  expect(source).not.toContain('cssx-probe');
});

it('uses the independent development stylesheet stream when a connection is available', () => {
  const source = nativeStylesheetHmr('assets/cssx.css', 'revision-a', { port: 45678, token: 'native-test' });

  expect(source).toContain('new EventSource');
  expect(source).toContain('http://127.0.0.1:45678/native-test');
  expect(source).not.toContain('module.hot.addStatusHandler');
  expect(source).not.toMatch(/setInterval|location\.reload/);
});
