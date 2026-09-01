import * as React from 'react';
import { sx } from '@cssxio/cssx';
import * as cssx from '@cssxio/cssx';

import '../index.css';

const styles = cssx.create({
  page: 'flex min-h-[100vh] items-center justify-center bg-purple-50 p-8 font-[var(--font-display)]',
  card: 'flex max-w-lg flex-col items-start gap-6 rounded-2xl bg-white p-8 text-slate-900 shadow-xl',
  eyebrow: 'text-sm font-medium text-brand',
  title: 'text-[2.5rem] leading-[1.1] font-semibold',
  copy: 'text-slate-600',
  hint: 'text-sm text-slate-500',
});

export default function IndexPage() {
  const [count, setCount] = React.useState(0);

  return (
    <main {...cssx.props(styles.page)}>
      <section {...cssx.props(styles.card)}>
        <span {...cssx.props(styles.eyebrow)}>Gatsby + webpack</span>
        <h1 {...cssx.props(styles.title)}>CSSX with Gatsby</h1>
        <p {...cssx.props(styles.copy)}>The Gatsby webpack hook registers the CSSX adapter for production builds.</p>
        <button
          className={sx(
            'rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-purple-800',
            count > 0 && 'scale-105',
          )}
          onClick={() => setCount((value) => value + 1)}
        >
          count is {count}
        </button>
        <p {...cssx.props(styles.hint)}>CSSX extracts each static style to one composite class.</p>
      </section>
    </main>
  );
}

export function Head() {
  return (
    <>
      <title>Gatsby + CSSX</title>
      <link rel="stylesheet" href="/cssx.css" />
    </>
  );
}
