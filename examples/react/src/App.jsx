import { sx } from '@cssxio/cssx';
import * as cssx from '@cssxio/cssx';
import { useState } from 'react';

const styles = cssx.create({
  page: 'flex justify-center items-center min-h-[100vh] p-8 font-[var(--font-display)] bg-slate-950',
  card: 'flex items-start flex-col max-w-lg gap-6 p-8 text-slate-100 rounded-2xl bg-slate-900 shadow-2xl',
  eyebrow: 'text-sm font-medium text-brand',
  title: 'leading-[1.1] text-[2.5rem] font-semibold',
  copy: 'text-slate-300',
  hint: 'text-sm text-slate-400',
});

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main data-cssx-probe="create" {...cssx.props(styles.page)}>
      <section {...cssx.props(styles.card)}>
        <span {...cssx.props(styles.eyebrow)}>Create React App</span>
        <h1 {...cssx.props(styles.title)}>CSSX through webpack</h1>
        <p {...cssx.props(styles.copy)}>
          This example adds the CSSX webpack adapter through the Create React App configuration override.
        </p>
        <button
          data-cssx-probe="sx"
          className={sx(
            'px-4 py-2 font-medium text-white rounded-md bg-brand hover:bg-cyan-700',
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
