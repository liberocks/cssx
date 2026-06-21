import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  assertPluginOptions,
  loadTheme,
  moduleId,
  resolveCssFileName,
  resolveEsbuildAssetPath,
  stableId,
  viteCssPath,
} from '../src/options';

describe('unplugin options', () => {
  it('loads inline and file-based themes', async () => {
    expect(await loadTheme({ theme: '@theme { --spacing: 2px; }' })).toContain('--spacing');
    expect(await loadTheme({ themeFile: 'TODO.md' })).toContain('# CSSX Implementation Plan');
  });

  it('validates mutually exclusive and safe output settings', () => {
    expect(() => assertPluginOptions({ theme: '', themeFile: 'theme.css' })).toThrow('either theme or themeFile');
    expect(() => assertPluginOptions({ layer: 'not valid' })).toThrow('valid CSS layer');
    expect(() => assertPluginOptions({ cssFileName: '' })).toThrow('non-empty relative');
    expect(() => assertPluginOptions({ cssFileName: '../escape.css' })).toThrow('must not escape');
    expect(() => assertPluginOptions({ cssFileName: 'styles.txt' })).toThrow('must end in .css');
