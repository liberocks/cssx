import { compileStyleRecords } from '@cssxio/compiler';
import { expect, it } from 'vitest';
import { withStableCompositeNames } from './with-stable-composite-names';

it('replaces style composite names and maps each composite to its atomic classes', () => {
  const compiled = compileStyleRecords({ root: 'p-4 text-red-500' });
  const result = withStableCompositeNames(compiled, '/project/App.tsx', 'map:styles');
  const className = result.styles.root?.c;

  expect(className).toMatch(/^d[a-z0-9]+$/);
  expect(result.classNames.root).toBe(className);
  expect(result.composites[className!]).toEqual(compiled.styles.root?._.map((record) => record[0]).filter(Boolean));
  expect(result.classes).toEqual(compiled.classes);
});
