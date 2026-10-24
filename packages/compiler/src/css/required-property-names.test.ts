import { expect, it } from 'vitest';

import { requiredPropertyNames } from './required-property-names';

it('registers a generated custom property for scrollbar thumb utilities', () => {
  expect(requiredPropertyNames('scrollbar-thumb-red-500/50')).toEqual(['--cssx-scrollbar-thumb']);
});

it('registers a generated custom property for scrollbar track utilities', () => {
  expect(requiredPropertyNames('scrollbar-track-black')).toEqual(['--cssx-scrollbar-track']);
});

it('requires no property registration for other utilities', () => {
  expect(requiredPropertyNames('p-4')).toEqual([]);
  expect(requiredPropertyNames('scrollbar-thumb')).toEqual([]);
});
