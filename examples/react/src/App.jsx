import { useState } from 'react';
import { sx } from '@cssxio/cssx';
import * as cssx from '@cssxio/cssx';

const styles = cssx.create({
  page: 'flex min-h-[100vh] items-center justify-center bg-slate-950 p-8 font-[var(--font-display)]',
  card: 'flex max-w-lg flex-col items-start gap-6 rounded-2xl bg-slate-900 p-8 text-slate-100 shadow-2xl',
  eyebrow: 'text-sm font-medium text-brand',
  title: 'text-[2.5rem] leading-[1.1] font-semibold',
  copy: 'text-slate-300',
  hint: 'text-sm text-slate-400',
});

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main {...cssx.props(styles.page)}>
      <section {...cssx.props(styles.card)}>
        <span {...cssx.props(styles.eyebrow)}>Create React App</span>
        <h1 {...cssx.props(styles.title)}>CSSX through webpack</h1>
        <p {...cssx.props(styles.copy)}>
          This example adds the CSSX webpack adapter through the Create React App configuration override.
        </p>
        <button
          className={sx(
            'rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-cyan-700',
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
