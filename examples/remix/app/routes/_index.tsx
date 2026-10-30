import { sx } from '@cssxio/cssx';
import * as cssx from '@cssxio/cssx';
import { useState } from 'react';

export const meta = () => [{ title: 'Remix + CSSX' }];

const styles = cssx.create({
  page: 'flex justify-center items-center min-h-[100vh] p-8 font-[var(--font-display)] bg-orange-50',
  card: 'flex items-start flex-col max-w-lg gap-6 p-8 text-slate-900 rounded-2xl bg-white shadow-xl',
  eyebrow: 'text-sm font-medium text-brand',
  title: 'leading-[1.1] text-[2.5rem] font-semibold',
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
            'px-4 py-2 font-medium text-white rounded-md bg-brand hover:bg-orange-700',
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
