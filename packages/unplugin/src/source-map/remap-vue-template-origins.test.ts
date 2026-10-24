import { expect, it } from 'vitest';

import { remapVueTemplateOrigins } from './remap-vue-template-origins';

it('maps wrapper candidates to the original template call location', () => {
  const wrapper = 'import { sx } from "@cssxio/cssx";\nconst style = sx("p-4");';
  const prefixLength = 'import { sx } from "@cssxio/cssx";\nconst style = '.length;
  const candidateOffset = wrapper.indexOf('p-4');
  const wrapperLineStart = wrapper.indexOf('\n') + 1;
  const source = '<div :class="sx(\'p-4\')" />';
  expect(
    remapVueTemplateOrigins(source, source.indexOf('sx'), wrapper, prefixLength, {
      p: { line: 1, column: candidateOffset - wrapperLineStart },
    }),
  ).toEqual({ p: { line: 0, column: 17 } });
  expect(remapVueTemplateOrigins('sx()', 0, wrapper, prefixLength, { p: { line: 0, column: 0 } })).toEqual({
    p: { line: 0, column: 0 },
  });
});
