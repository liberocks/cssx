import { expect, it } from 'vitest';

import { BACKGROUND_UTILITY_DECLARATIONS } from './background-utility-declarations';

it('keeps each fixed background candidate in its recipe table', () => {
  expect(Object.keys(BACKGROUND_UTILITY_DECLARATIONS)).toEqual([
    'bg-none',
    'bg-auto',
    'bg-cover',
    'bg-contain',
    'bg-top-left',
    'bg-top',
    'bg-top-right',
    'bg-left',
    'bg-center',
    'bg-right',
    'bg-bottom-left',
    'bg-bottom',
    'bg-bottom-right',
    'bg-repeat',
    'bg-no-repeat',
    'bg-repeat-x',
    'bg-repeat-y',
    'bg-repeat-round',
    'bg-repeat-space',
    'bg-fixed',
    'bg-local',
    'bg-scroll',
    'bg-clip-border',
    'bg-clip-padding',
    'bg-clip-content',
    'bg-clip-text',
    'bg-origin-border',
    'bg-origin-padding',
    'bg-origin-content',
  ]);
});

it('preserves the multi-declaration text clipping recipe', () => {
  expect(BACKGROUND_UTILITY_DECLARATIONS['bg-clip-text']).toEqual([
    { property: '-webkit-background-clip', value: 'text', semanticGroup: 'background-clip' },
    { property: 'background-clip', value: 'text', semanticGroup: 'background-clip' },
    { property: 'color', value: 'transparent', semanticGroup: 'background-clip' },
  ]);
});
