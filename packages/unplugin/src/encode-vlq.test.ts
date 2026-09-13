import { expect, it } from 'vitest';

import { encodeVlq } from './encode-vlq';

it('encodes signed integers and continuation chunks as base64 VLQ', () => {
  expect(encodeVlq(0)).toBe('A');
  expect(encodeVlq(1)).toBe('C');
  expect(encodeVlq(-1)).toBe('D');
  expect(encodeVlq(16)).toBe('gB');
  expect(encodeVlq(-16)).toBe('hB');
});
