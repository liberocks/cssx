import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as cssx from '@cssxio/cssx';

const styles = cssx.create({
  main: 'flex min-h-screen items-center justify-center bg-slate-950 p-8 text-white',
  card: 'w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-8 shadow-2xl',
  badge: 'inline-flex rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold',
  title: 'mt-4 text-2xl font-bold tracking-tight',
  button: 'mt-6 rounded-lg bg-violet-600 px-4 py-2 font-semibold hover:bg-violet-500',
});

function App() {
  const [count, setCount] = useState(0);
  return (
    <main {...cssx.props(styles.main)}>
      <section {...cssx.props(styles.card)}>
        <span {...cssx.props(styles.badge)}>Electron renderer</span>
        <h1 {...cssx.props(styles.title)}>CSSX desktop styles</h1>
        <p>Generated CSS runs in an isolated, sandboxed Chromium renderer.</p>
        <button {...cssx.props(styles.button)} onClick={() => setCount((value) => value + 1)}>
          count is {count}
        </button>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
