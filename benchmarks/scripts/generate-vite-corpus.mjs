import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createWorkload } from './workload.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workload = createWorkload('small');
const target = process.argv[2];
const REPEAT_COUNT = 100;
const components = Array.from({ length: 2_000 }, (_, index) => {
  const base = workload.components[index % workload.components.length];
  const width = 160 + index;
  return {
    ...base,
    name: `component${index}`,
    candidates: base.candidates.map((candidate) =>
      candidate.startsWith('[width:') ? `[width:${width}px]` : candidate,
    ),
    stylex: { ...base.stylex, width: `${width}px` },
  };
});

if (!['cssx', 'tailwind', 'styled-components', 'stylex'].includes(target)) {
  throw new Error('Choose one target: cssx, tailwind, styled-components, stylex.');
}

const cards = (classNames) => `
export function Corpus() {
  return <section aria-label="Canonical 200,000-component corpus" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: ${REPEAT_COUNT} }, (_, copy) => <>${components
      .map(
        (component, index) =>
          `<div key={\`${'${copy}'}-${index}\`} className={${classNames(index)}}>Component {${index + 1} + copy * ${components.length}}</div>`,
      )
      .join('')}</>)}
  </section>;
}
`;

let source;
if (target === 'cssx') {
  source = `import * as cssx from '@cssxio/cssx';
const styles = cssx.create({
${components.map((component) => `  ${component.name}: ${JSON.stringify(component.candidates.join(' '))},`).join('\n')}
});
${cards((index) => `cssx.props(styles.component${index}).className`)}
`;
} else if (target === 'tailwind') {
  source = `${cards((index) => JSON.stringify(components[index].candidates.join(' ')))}
`;
} else if (target === 'styled-components') {
  source = `import styled from 'styled-components';
${components
  .map(
    (component, index) => `const Component${index} = styled.div\`
${styledComponentCss(component.stylex)}
\`;`,
  )
  .join('\n')}
export function Corpus() {
  return <section aria-label="Canonical 200,000-component corpus" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: ${REPEAT_COUNT} }, (_, copy) => <>${components
      .map(
        (_, index) =>
          `<Component${index} key={\`${'${copy}'}-${index}\`}>Component {${index + 1} + copy * ${components.length}}</Component${index}>`,
      )
      .join('')}</>)}
  </section>;
}
`;
} else {
  source = `import * as stylex from '@stylexjs/stylex';
const styles = stylex.create({
${components.map((component) => `  ${component.name}: ${JSON.stringify(component.stylex)},`).join('\n')}
});
${cards((index) => `stylex.props(styles.component${index}).className`)}
`;
}

await writeFile(resolve(root, target, 'src/corpus.tsx'), source);

function styledComponentCss(style) {
  return Object.entries(style)
    .map(([property, value]) => `  ${property.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}: ${value};`)
    .join('\n');
}
