import { useState } from 'react';
import { sx } from '@cssxio/cssx';
import * as cssx from '@cssxio/cssx';

import reactLogo from './assets/react.svg';

const styles = cssx.create({
  page: 'flex min-h-[100vh] flex-col items-center justify-center gap-6 bg-slate-950 p-8 text-center text-slate-100 font-[var(--font-display)]',
  logos: 'flex items-center justify-center gap-2',
  logoLink: 'rounded-md p-4 hover:scale-105',
  logo: 'h-24 w-24',
  title: 'text-[2.5rem] leading-[1.2] font-semibold',
  card: 'flex flex-col items-center gap-4',
  copy: 'text-sm text-slate-300',
  hint: 'text-sm text-slate-400',
});

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <main {...cssx.props(styles.page)}>
      <div {...cssx.props(styles.logos)}>
        <a {...cssx.props(styles.logoLink)} href="https://vite.dev" target="_blank" rel="noreferrer">
          <img {...cssx.props(styles.logo)} src="/vite.svg" alt="Vite logo" />
        </a>
        <a {...cssx.props(styles.logoLink)} href="https://react.dev" target="_blank" rel="noreferrer">
          <img className={sx('h-24 w-24 animate-logo-spin')} src={reactLogo} alt="React logo" />
        </a>
      </div>
      <h1 {...cssx.props(styles.title)}>Vite + React</h1>
      <div {...cssx.props(styles.card)}>
        <button
          className={sx(
            'rounded-md bg-brand px-4 py-2 font-medium text-white hover:bg-blue-700',
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
