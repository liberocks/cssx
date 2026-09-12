import { sx } from '@cssxio/cssx';

import type { Lang } from './type.ts';

const mono = sx('font-mono');
const link = sx('text-brand underline underline-offset-2');

const lang: Lang = {
  index: {
    title: ['超高速なアプリケーションのための、Webで最も軽量なスタイルエンジン', { tag: 'sup', children: '*' }],
    footnote: [
      { tag: 'sup', children: '*' },
      'ベンチマークではそういう結果になりましたが、ぜひあなたの環境でも計測して確かめてみてください。',
    ],
    description: [
      '不要なボイラープレートを本番環境に持ち込まない。一般的なアプリでは、CSSのおよそ3分の1が実際には使われていません。',
      { tag: 'span', class: mono, children: 'cssx' },
      ' は未使用のスタイルを削除し、残ったCSSを最小化。さらに、本番環境では長いユーティリティクラス名も短縮します。',
      { tag: 'br' },
      'それでも、開発体験はそのまま。エディタ上では、これまでどおり読みやすく、使い慣れたCSSユーティリティクラスをそのまま利用できます。',
    ],
    readDocumentation: 'ドキュメントを見る',
    worksWith: [{ tag: 'span', class: mono, children: 'cssx' }, ' は以下の環境に対応しています'],
  },
  docs: {
    title: 'ドキュメント',
    description: [
      { tag: 'span', class: mono, children: 'cssx' },
      ' のドキュメントは準備中です。それまでの間は、',
      {
        tag: 'a',
        class: link,
        attrs: { href: 'https://github.com/liberocks/cssx' },
        children: 'GitHub リポジトリ',
      },
      ' または ',
      {
        tag: 'a',
        class: link,
        attrs: { href: 'https://www.npmjs.com/package/@cssxio/cssx' },
        children: 'npm パッケージ',
      },
      ' をご覧ください。',
    ],
    backHome: 'ホームに戻る',
  },
};

export default lang;
