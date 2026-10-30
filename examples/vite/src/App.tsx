import { sx } from '@cssxio/cssx';
import * as cssx from '@cssxio/cssx';
import { useState } from 'react';

import reactLogo from './assets/react.svg';

const styles = cssx.create({
  page: 'flex justify-center items-center flex-col min-h-[100vh] gap-6 p-8 font-[var(--font-display)] text-center text-slate-100 bg-slate-950',
  logos: 'flex justify-center items-center gap-2',
  logoLink: 'p-4 rounded-md hover:scale-105',
  logo: 'w-24 h-24',
  title: 'leading-[1.2] text-[2.5rem] font-semibold',
  card: 'flex items-center flex-col gap-4',
  copy: 'text-sm text-slate-300',
  hint: 'text-sm text-slate-400',
});

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main data-cssx-probe="create" {...cssx.props(styles.page)}>
      <div {...cssx.props(styles.logos)}>
        <a {...cssx.props(styles.logoLink)} href="https://vite.dev" target="_blank" rel="noreferrer">
          <img {...cssx.props(styles.logo)} src="/vite.svg" alt="Vite logo" />
        </a>
        <a {...cssx.props(styles.logoLink)} href="https://react.dev" target="_blank" rel="noreferrer">
          <img className={sx('w-24 h-24 animate-logo-spin')} src={reactLogo} alt="React logo" />
        </a>
      </div>
      <h1 {...cssx.props(styles.title)}>Vite + React</h1>
      <div {...cssx.props(styles.card)}>
        <button
          data-cssx-probe="sx"
          className={sx(
            'px-4 py-2 font-medium text-white rounded-md bg-brand hover:bg-blue-700',
            count > 0 && 'scale-105',
          )}
          onClick={() => setCount((value) => value + 1)}
        >
          count is {count}
        </button>
        <p {...cssx.props(styles.copy)}>
          Edit <code className={sx('text-brand')}>src/main.tsx</code> and save to test HMR
        </p>
      </div>
      <p {...cssx.props(styles.hint)}>CSSX extracts static utilities and joins counter state with sx.</p>
    </main>
  );
}
