import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  assertPluginOptions,
  developmentPluginOptions,
  effectiveClassNameOptions,
  isDevelopmentMode,
  loadTheme,
  moduleId,
  resolveCssFileName,
  resolveEsbuildAssetPath,
  stableId,
  viteCssPath,
} from './options';

describe('unplugin options', () => {
  it('loads inline and file-based themes', async () => {
    expect(await loadTheme({ theme: '@theme { --spacing: 2px; }' })).toContain('--spacing');
    expect(await loadTheme({ themeFile: 'README.md' })).toContain('# CSSX');
  });

  it('validates mutually exclusive and safe output settings', () => {
    expect(() => assertPluginOptions({ mode: 'test' as never })).toThrow('mode must be');
    expect(() => assertPluginOptions({ mode: 'development' })).not.toThrow();
    expect(() => assertPluginOptions({ mode: 'production' })).not.toThrow();
    expect(() => assertPluginOptions({ stableClassNameStrategy: 'module-order' })).not.toThrow();
    expect(() => assertPluginOptions({ stableClassNameStrategy: 'invalid' as never })).toThrow(
      'stableClassNameStrategy must be',
    );
    expect(() => assertPluginOptions({ theme: '', themeFile: 'theme.css' })).toThrow('either theme or themeFile');
    expect(() => assertPluginOptions({ layer: 'not valid' })).toThrow('valid CSS layer');
    expect(() => assertPluginOptions({ cssFileName: '' })).toThrow('non-empty relative');
    expect(() => assertPluginOptions({ cssFileName: '../escape.css' })).toThrow('must not escape');
    expect(() => assertPluginOptions({ cssFileName: 'styles.txt' })).toThrow('must end in .css');
    expect(() => assertPluginOptions({ sourceMap: 'false' } as never)).toThrow('sourceMap must be a boolean');
    expect(() => assertPluginOptions({ darkMode: 'system' as never })).toThrow(
      'darkMode must be "media", "selector", or "class"',
    );
    expect(() => assertPluginOptions({ darkMode: 'class' })).not.toThrow();
    expect(() => assertPluginOptions({ preflight: 'true' as never })).toThrow('preflight must be a boolean');
    expect(() => assertPluginOptions({ preflight: true })).not.toThrow();
    expect(() => assertPluginOptions({ reusabilityBudget: Number.NaN })).toThrow('reusabilityBudget');
    expect(() => assertPluginOptions({ reusabilityBudget: -1 })).toThrow('reusabilityBudget');
    expect(() => assertPluginOptions({ reusabilityBudget: 101 })).toThrow('reusabilityBudget');
    expect(() => assertPluginOptions({ reusabilityBudget: 'auto' })).not.toThrow();
    expect(() => assertPluginOptions({ reusabilityBudget: 0 })).not.toThrow();
    expect(() => assertPluginOptions({ cssFileName: 'assets/cssx.css', layer: 'cssx_layer' })).not.toThrow();
  });

  it('makes deterministic CSS asset names and paths', () => {
    expect(stableId('css')).toBe(stableId('css'));
    expect(resolveCssFileName('assets/[hash].css', 'body{}')).toMatch(/^assets\/[a-z0-9]+\.css$/);
    expect(viteCssPath('/app/', 'assets/cssx.css')).toBe('/app/assets/cssx.css');
    expect(viteCssPath(undefined, 'cssx.css')).toBe('/cssx.css');
    expect(moduleId('/project/source.ts?type=script')).toBe('/project/source.ts');
    expect(resolveEsbuildAssetPath('/project', { outdir: 'dist' }, 'cssx.css')).toBe(resolve('/project/dist/cssx.css'));
    expect(resolveEsbuildAssetPath('/project', { outfile: 'dist/app.js' }, 'cssx.css')).toBe(
      resolve('/project/dist/cssx.css'),
    );
    expect(resolveEsbuildAssetPath('/project', {}, 'cssx.css')).toBe(resolve('/project/cssx.css'));
  });

  it('resolves generated naming independently from composite naming mode', () => {
    expect(effectiveClassNameOptions({ naming: 'hash' })).toEqual({ variant: 'random' });
    expect(effectiveClassNameOptions({ naming: 'serial' })).toEqual({ variant: 'serial' });
    expect(effectiveClassNameOptions({ naming: 'source', className: { prefix: 'cssx-' } })).toEqual({
      prefix: 'cssx-',
    });
    expect(effectiveClassNameOptions({ className: { prefix: 'custom-' } })).toEqual({ prefix: 'custom-' });
    expect(() => effectiveClassNameOptions({ naming: 'hash', className: { variant: 'serial' } })).toThrow('conflicts');
    expect(() => effectiveClassNameOptions({ naming: 'serial', className: { variant: 'random' } })).toThrow(
      'conflicts',
    );
  });

  it('normalizes development settings and honors explicit mode before build inference', () => {
    expect(
      developmentPluginOptions({
        naming: 'serial',
        coordination: 'manifest',
        manifestPath: 'classes.json',
        className: { variant: 'serial' },
        reusabilityBudget: 100,
      }),
    ).toMatchObject({
      mode: 'development',
      naming: 'source',
      stableClassNames: true,
      stableClassNameStrategy: 'module-order',
      coordination: 'memory',
      manifestPath: undefined,
      className: { variant: 'random' },
      reusabilityBudget: 0,
    });
    expect(isDevelopmentMode({ mode: 'production' }, { watchMode: true, bundlerMode: 'development' })).toBe(false);
    expect(isDevelopmentMode({ mode: 'development' }, { bundlerMode: 'production' })).toBe(true);
    expect(isDevelopmentMode({}, { watchMode: true })).toBe(true);
    expect(isDevelopmentMode({}, { bundlerMode: 'development' })).toBe(true);
    expect(isDevelopmentMode({}, { viteDevServer: true })).toBe(true);
  });
});
