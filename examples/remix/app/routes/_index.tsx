import { useState } from 'react';
import type { MetaFunction } from '@remix-run/node';
import { sx } from '@cssxio/cssx';
import * as cssx from '@cssxio/cssx';

export const meta: MetaFunction = () => [{ title: 'Remix + CSSX' }];

const styles = cssx.create({
  page: 'flex min-h-[100vh] items-center justify-center bg-orange-50 p-8 font-[var(--font-display)]',
  card: 'flex max-w-lg flex-col items-start gap-6 rounded-2xl bg-white p-8 text-slate-900 shadow-xl',
  eyebrow: 'text-sm font-medium text-brand',
  title: 'text-[2.5rem] leading-[1.1] font-semibold',
  copy: 'text-slate-600',
  hint: 'text-sm text-slate-500',
});

export default function Index() {
  const [count, setCount] = useState(0);

  return (
    <main data-cssx-probe="create" {...cssx.props(styles.page)}>
      <section {...cssx.props(styles.card)}>
        <span {...cssx.props(styles.eyebrow)}>Remix + Vite</span>
        <h1 {...cssx.props(styles.title)}>CSSX with Remix</h1>
        <p {...cssx.props(styles.copy)}>The Vite adapter emits a stylesheet for the Remix document to load.</p>
        <button
          data-cssx-probe="sx"
          className={sx(
            'rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-orange-700',
            count > 0 && 'scale-105',
          )}
          onClick={() => setCount((value) => value + 1)}
        >
          count is {count}
        </button>
        <p {...cssx.props(styles.hint)}>CSSX extracts static utilities and composes counter state at runtime.</p>
      </section>
    </main>
  );
}
