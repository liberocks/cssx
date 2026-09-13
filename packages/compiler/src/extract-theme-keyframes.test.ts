import { expect, it } from 'vitest';
import { extractThemeKeyframes } from './extract-theme-keyframes';

it('removes validated keyframes while retaining surrounding declarations', () => {
  const keyframes: Record<string, string> = {};

  const declarations = extractThemeKeyframes(
    ' --before: 1; @keyframes fade { from { opacity: 0; } to { opacity: 1; } } --after: 2;',
    keyframes,
  );

  expect(declarations).toBe(' --before: 1;  --after: 2;');
  expect(keyframes.fade).toBe('@keyframes fade{ from { opacity: 0; } to { opacity: 1; } }');
});

it('rejects invalid keyframe names and missing rule blocks', () => {
  expect(() => extractThemeKeyframes('@keyframes 1fade { to { opacity: 1; } }', {})).toThrow(
    'Invalid CSSX @keyframes name',
  );
  expect(() => extractThemeKeyframes('@keyframes fade', {})).toThrow('Expected "{" after @keyframes fade');
});
