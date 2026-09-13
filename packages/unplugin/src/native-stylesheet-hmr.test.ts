import { expect, it } from 'vitest';
import { nativeStylesheetHmr } from './native-stylesheet-hmr';

it('creates a scoped stylesheet HMR bridge', () => {
  const source = nativeStylesheetHmr('assets/cssx.css');

  expect(source).toContain('endsWith("/assets/cssx.css")');
  expect(source).toContain('__cssxStylesheetHmr');
  expect(source).toContain('cssx-probe');
});
