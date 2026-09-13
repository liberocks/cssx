import { expect, it } from 'vitest';

import { FILTER_CHANNEL_VALUES } from './filter-channel-values';

it('provides the complete named filter and opacity scales', () => {
  expect(Object.keys(FILTER_CHANNEL_VALUES)).toEqual([
    'blur',
    'brightness',
    'contrast',
    'grayscale',
    'invert',
    'saturate',
    'sepia',
    'opacity',
  ]);

  expect(Object.keys(FILTER_CHANNEL_VALUES.blur ?? {})).toEqual([
    'DEFAULT',
    'none',
    'xs',
    'sm',
    'md',
    'lg',
    'xl',
    '2xl',
    '3xl',
  ]);
  expect(Object.keys(FILTER_CHANNEL_VALUES.brightness ?? {})).toEqual([
    '0',
    '50',
    '75',
    '90',
    '95',
    '100',
    '105',
    '110',
    '125',
    '150',
    '200',
  ]);
  expect(Object.keys(FILTER_CHANNEL_VALUES.contrast ?? {})).toEqual(['0', '50', '75', '100', '125', '150', '200']);
  expect(Object.keys(FILTER_CHANNEL_VALUES.opacity ?? {})).toEqual([
    '0',
    '5',
    '10',
    '15',
    '20',
    '25',
    '30',
    '40',
    '50',
    '60',
    '70',
    '75',
    '80',
    '90',
    '95',
    '100',
  ]);
});

it('maps documented scale names to their CSS filter channel values', () => {
  expect(FILTER_CHANNEL_VALUES.blur).toMatchObject({ DEFAULT: '8px', xs: '4px', '3xl': '64px' });
  expect(FILTER_CHANNEL_VALUES.brightness).toMatchObject({ '0': '0', '125': '1.25', '200': '2' });
  expect(FILTER_CHANNEL_VALUES.grayscale).toEqual({ '0': '0', DEFAULT: '1' });
  expect(FILTER_CHANNEL_VALUES.invert).toEqual({ '0': '0', DEFAULT: '1' });
  expect(FILTER_CHANNEL_VALUES.opacity).toMatchObject({ '0': '0', '50': '.5', '100': '1' });
  expect(FILTER_CHANNEL_VALUES.sepia).toEqual({ '0': '0', DEFAULT: '1' });
});
