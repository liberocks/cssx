import { expect, it } from 'vitest';
import { stableId } from './stable-id';

it('creates deterministic short IDs', () => {
  expect(stableId('css')).toBe(stableId('css'));
});
