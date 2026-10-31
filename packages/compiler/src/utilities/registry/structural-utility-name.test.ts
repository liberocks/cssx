import { expect, it } from 'vitest';

import { structuralUtilityName } from './structural-utility-name';

it('resolves built-in and named structural marker classes', () => {
  expect(structuralUtilityName('structural-group')).toBe('group');
  expect(structuralUtilityName('structural-peer:peer-field-label')).toBe('peer-field-label');
  expect(structuralUtilityName('display')).toBeNull();
});
