import { expect, it, vi } from 'vitest';

// @ts-expect-error The editor extension ships CommonJS without declaration files.
import { loadEditorApi } from './load-editor-api.js';

it('loads the host editor API by module name', () => {
  const editor = {};
  const load = vi.fn(() => editor);

  expect(loadEditorApi(load)).toBe(editor);
  expect(load).toHaveBeenCalledWith('vscode');
});
