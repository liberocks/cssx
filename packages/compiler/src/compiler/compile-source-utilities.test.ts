import { expect, it } from 'vitest';

import { compileSourceUtilities } from './compile-source-utilities';

it('compiles source selectors with the supplied theme and variants', async () => {
  const result = await compileSourceUtilities(['sm:p-2', 'hover:bg-red-500'], '@theme { --spacing: 1rem; }');

  expect(result.classes).toEqual({ 'sm:p-2': 'sm:p-2', 'hover:bg-red-500': 'hover:bg-red-500' });
  expect(result.css).toContain('.sm\\:p-2');
  expect(result.css).toContain('@media (width >= 40rem)');
  expect(result.css).toContain('padding:calc(1rem * 2)');
  expect(result.css).toContain('.hover\\:bg-red-500:hover');
});

it('uses an optional safe source class selector for a candidate', async () => {
  const result = await compileSourceUtilities(
    ['grid-cols-[13rem minmax(0,1fr)]'],
    '',
    {},
    {
      'grid-cols-[13rem minmax(0,1fr)]': 'cssx-html-a',
    },
  );

  expect(result.classes['grid-cols-[13rem minmax(0,1fr)]']).toBe('cssx-html-a');
  expect(result.css).toContain('.cssx-html-a{grid-template-columns:13rem minmax(0,1fr);}');
  expect(result.css).not.toContain('.grid-cols-');
});

it('rejects unsafe or multiple source aliases', async () => {
  await expect(compileSourceUtilities(['p-1'], '', {}, { 'p-1': 'safe bad' })).rejects.toThrow(
    'exactly one safe class name',
  );
  await expect(compileSourceUtilities(['p-1'], '', {}, { 'p-1': 'bad!name' })).rejects.toThrow(
    'unsafe generated class name',
  );
});
