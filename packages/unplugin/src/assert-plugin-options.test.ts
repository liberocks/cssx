import { expect, it } from 'vitest';
import { assertPluginOptions } from './assert-plugin-options';

it('rejects incompatible theme options', () => {
  expect(() => assertPluginOptions({ theme: '', themeFile: 'theme.css' })).toThrow('either theme or themeFile');
});
