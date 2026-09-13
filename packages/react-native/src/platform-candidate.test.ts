import { expect, it } from 'vitest';

import { platformCandidate } from './platform-candidate';

it('selects matching platform utilities and filters other platforms', () => {
  expect(platformCandidate('ios:p-4', 'ios')).toBe('p-4');
  expect(platformCandidate('android:p-4', 'ios')).toBeNull();
  expect(platformCandidate('ios:p-4', undefined)).toBeNull();
});

it('passes unprefixed and arbitrary candidates while rejecting browser variants', () => {
  expect(platformCandidate('p-4', 'android')).toBe('p-4');
  expect(platformCandidate('[&:hover]:p-4', 'android')).toBe('[&:hover]:p-4');
  expect(() => platformCandidate('hover:p-4', 'ios')).toThrow('cannot represent the variant');
});
