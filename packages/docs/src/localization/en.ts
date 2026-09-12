import { sx } from '@cssxio/cssx';

import type { Lang } from './type.ts';

const mono = sx('font-mono');
const link = sx('text-brand underline underline-offset-2');

const lang: Lang = {
  index: {
    title: ['The leanest style engine in the internet for your ultrafast applications', { tag: 'sup', children: '*' }],
    footnote: [{ tag: 'sup', children: '*' }, 'Our benchmark said so, but you should benchmark yourself to make sure.'],
    description: [
      'Don’t let boilerplate ship to production. On average, one-third of your app’s CSS goes unused. ',
      { tag: 'span', class: mono, children: 'cssx' },
      ' strips unused styles, minifies the rest, and eliminates long utility class names in production while keeping your development experience intact. In your editor, you’ll still see the full, readable CSS class utilities you know and love.',
    ],
    readDocumentation: 'Read Documentation',
    worksWith: [{ tag: 'span', class: mono, children: 'cssx' }, ' works with'],
  },
  docs: {
    title: 'Documentation',
    description: [
      'The ',
      { tag: 'span', class: mono, children: 'cssx' },
      ' documentation is still taking shape. Until it is ready, check out the ',
      {
        tag: 'a',
        class: link,
        attrs: { href: 'https://github.com/liberocks/cssx' },
        children: 'GitHub repository',
      },
      ' or the ',
      {
        tag: 'a',
        class: link,
        attrs: { href: 'https://www.npmjs.com/package/@cssxio/cssx' },
        children: 'npm package',
      },
      '.',
    ],
    backHome: 'Back to home',
  },
};

export default lang;
