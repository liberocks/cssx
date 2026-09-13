import { expect, it } from 'vitest';

import { requiredAnimationKeyframes } from './required-animation-keyframes';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

const theme: CssxTheme = {
  tokens: { '--animate-pulse': 'pulse 2s ease' },
  keyframes: { pulse: '…', 'fade.in': '…', spin: '…' },
  mode: 'inline',
  prefix: '',
};

it('collects animation names that exist in the theme', () => {
  expect(requiredAnimationKeyframes([{ property: 'animation-name', value: 'pulse, spin, missing' }], theme)).toEqual([
    'pulse',
    'spin',
  ]);
});

it('ignores animation names absent from the theme', () => {
  expect(requiredAnimationKeyframes([{ property: 'animation-name', value: 'ghost' }], theme)).toEqual([]);
});

it('resolves theme references in animation shorthands before matching', () => {
  expect(requiredAnimationKeyframes([{ property: 'animation', value: 'var(--animate-pulse) linear' }], theme)).toEqual([
    'pulse',
  ]);
});

it('ignores animation shorthand values without theme keyframes', () => {
  expect(requiredAnimationKeyframes([{ property: 'animation', value: 'ghost 1s' }], theme)).toEqual([]);
});

it('matches keyframe names that contain regular-expression characters', () => {
  expect(requiredAnimationKeyframes([{ property: 'animation', value: 'fade.in 1s' }], theme)).toEqual(['fade.in']);
});

it('ignores declarations that are not animation utilities', () => {
  expect(requiredAnimationKeyframes([{ property: 'color', value: 'red' }], theme)).toEqual([]);
});