import { expect, it } from 'vitest';

import { stripTrailingDeclarationSemicolons } from './strip-trailing-declaration-semicolons';

it('removes terminal declaration semicolons while preserving nested rules', () => {
  expect(stripTrailingDeclarationSemicolons('.a{color:red;}.b{color:blue;}')).toBe('.a{color:red}.b{color:blue}');
  expect(stripTrailingDeclarationSemicolons('@media(x){.a{color:red;}}')).toBe('@media(x){.a{color:red}}');
});

it('preserves semicolons inside strings, comments, and non-terminal declarations', () => {
  expect(stripTrailingDeclarationSemicolons(`.a{content:";}";content:';\\\\';/* ;} */color:red;}`)).toBe(
    `.a{content:";}";content:';\\\\';/* ;} */color:red}`,
  );
});

it('keeps declaration semicolons when whitespace comments precede a closing brace', () => {
  expect(stripTrailingDeclarationSemicolons('.a{color:red; /* gap */ }')).toBe('.a{color:red; /* gap */ }');
});
