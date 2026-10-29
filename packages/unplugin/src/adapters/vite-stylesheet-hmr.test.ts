import { expect, it } from 'vitest';

import { viteDevelopmentStylesheetHmr } from './vite-stylesheet-hmr';

it('connects an automatic browser stream and atomically replaces the stylesheet', () => {
  const bridge = viteDevelopmentStylesheetHmr('assets/cssx.css');

  expect(bridge).toContain('new EventSource(import.meta.env.BASE_URL + "assets/cssx.css.events")');
  expect(bridge).toContain('source.onmessage = (event) =>');
  expect(bridge).toContain('endsWith("/assets/cssx.css")');
  expect(bridge).toContain('state.style?.remove()');
  expect(bridge).not.toMatch(/setInterval|location\.reload|import\.meta\.hot/);
});
