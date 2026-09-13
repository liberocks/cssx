import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { resolveEsbuildAssetPath } from './resolve-esbuild-asset-path';

it('uses esbuild output directories and files', () => {
  expect(resolveEsbuildAssetPath('/project', { outdir: 'dist' }, 'cssx.css')).toBe(resolve('/project/dist/cssx.css'));
  expect(resolveEsbuildAssetPath('/project', { outfile: 'dist/app.js' }, 'cssx.css')).toBe(
    resolve('/project/dist/cssx.css'),
  );
});
