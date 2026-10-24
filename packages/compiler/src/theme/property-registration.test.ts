import { expect, it } from 'vitest';

import { propertyRegistration } from './property-registration';

it('emits a color property registration rule', () => {
  expect(propertyRegistration('--cssx-scrollbar-thumb')).toBe(
    '@property --cssx-scrollbar-thumb{syntax:"<color>";inherits:true;initial-value:#0000;}',
  );
});
