import * as cssx from '@cssxio/cssx';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';

const styles = cssx.create({
  main: 'flex justify-center items-center min-h-screen p-8 text-white bg-slate-950',
  card: 'w-full max-w-xl p-8 rounded-2xl border-slate-700 border bg-slate-900 shadow-2xl',
  badge: 'inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-600',
  title: 'mt-4 tracking-tight text-2xl font-bold',
  button: 'mt-6 px-4 py-2 font-semibold rounded-lg bg-violet-600 hover:bg-violet-500',
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
