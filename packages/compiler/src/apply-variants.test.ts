import { describe, expect, it } from 'vitest';

import { applyVariants } from './apply-variants';
import { parseTheme } from './theme';

describe('applyVariants', () => {
  const theme = parseTheme();
  const declarations = [{ property: 'color', value: 'red' }];

  it('applies pseudo, interaction, and generated child selectors', () => {
    expect(applyVariants('.x', declarations, ['hover'], theme)).toBe('@media (hover: hover){.x:hover{color:red;}}');
    expect(applyVariants('.x', declarations, ['before'], theme)).toBe(
      '.x::before{content:var(--cssx-content, "");color:red;}',
    );
    expect(applyVariants('.x', declarations, ['*'], theme)).toBe(':is(.x > *){color:red;}');
    expect(applyVariants('.x', declarations, ['**'], theme)).toBe(':is(.x *){color:red;}');
  });

  it('applies relationship, state, and arbitrary selector variants', () => {
    expect(applyVariants('.x', declarations, ['group-hover'], theme)).toBe('.group:hover .x{color:red;}');
    expect(applyVariants('.x', declarations, ['peer-focus'], theme)).toBe('.peer:focus ~ .x{color:red;}');
    expect(applyVariants('.x', declarations, ['has-checked'], theme)).toBe('.x:has(*:checked){color:red;}');
    expect(applyVariants('.x', declarations, ['not-invalid'], theme)).toBe('.x:not(*:invalid){color:red;}');
    expect(applyVariants('.x', declarations, ['in-focus'], theme)).toBe(':where(*:focus) .x{color:red;}');
    expect(applyVariants('.x', declarations, ['state-[expanded]'], theme)).toBe('.x:state(expanded){color:red;}');
    expect(applyVariants('.x', declarations, ['group-state-[expanded]'], theme)).toBe(
      '.group:state(expanded) .x{color:red;}',
    );
    expect(applyVariants('.x', declarations, ['[&:is(.card_item)]'], theme)).toBe('.x:is(.card item){color:red;}');
  });

  it('nests responsive, environment, and declaration at-rules in source order', () => {
    expect(
      applyVariants(
        '.x',
        [
          { property: 'color', value: 'red', atRule: '@media (prefers-color-scheme: light)' },
          { property: 'display', value: 'block' },
        ],
        ['sm', 'dark', 'motion-safe'],
        theme,
      ),
    ).toBe(
      '@media (width >= 40rem){@media (prefers-color-scheme: dark){@media (prefers-reduced-motion: no-preference){@media (prefers-color-scheme: light){.x{color:red;}}.x{display:block;}}}}',
    );
    expect(applyVariants('.x', declarations, ['min-[600px]'], theme)).toBe('@media (width >= 600px){.x{color:red;}}');
    expect(applyVariants('.x', declarations, ['max-[80rem]'], theme)).toBe('@media (width < 80rem){.x{color:red;}}');
    expect(applyVariants('.x', declarations, ['[@supports (display: grid)]'], theme)).toBe(
      '@supports (display: grid){.x{color:red;}}',
    );
  });

  it('supports dark modes, attribute variants, and transition pseudo-elements', () => {
    expect(applyVariants('.x', declarations, ['dark'], theme, { darkMode: 'class' })).toBe(
      '.x:where(.dark, .dark *){color:red;}',
    );
    expect(applyVariants('.x', declarations, ['dark'], theme, { darkMode: 'selector' })).toBe(
      '.x:where([data-theme=dark], [data-theme=dark] *){color:red;}',
    );
    expect(applyVariants('.x', declarations, ['data-[mode=compact]'], theme)).toBe('.x[data-mode=compact]{color:red;}');
    expect(applyVariants('.x', declarations, ['aria-expanded'], theme)).toBe('.x[aria-expanded="true"]{color:red;}');
    expect(applyVariants('.x', declarations, ['supports-[display:grid]'], theme)).toBe(
      '@supports (display: grid){.x{color:red;}}',
    );
    expect(applyVariants('.x', declarations, ['vt-old-[card]'], theme)).toBe(
      '@supports (view-transition-name: none){.x::view-transition-old(card){color:red;}}',
    );
  });

  it('rejects mixed selector scopes and variants without safe rendering rules', () => {
    expect(() =>
      applyVariants(
        '.x',
        [
          { property: 'color', value: 'red', selectorSuffix: '::before' },
          { property: 'display', value: 'block' },
        ],
        [],
        theme,
      ),
    ).toThrow('share one selector scope');
    expect(() => applyVariants('.x', declarations, ['unknown'], theme)).toThrow('does not support variant');
    expect(() => applyVariants('.x', declarations, ['min-[]'], theme)).toThrow('Invalid CSSX responsive variant');
  });
});
