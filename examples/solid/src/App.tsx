import { createSignal } from 'solid-js';
import { sx } from '@cssxio/cssx';
import * as cssx from '@cssxio/cssx';

import solidLogo from './assets/solid.svg';

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
  const [count, setCount] = createSignal(0);

  return (
    <main {...cssx.props(styles.page)}>
      <div {...cssx.props(styles.logos)}>
        <a {...cssx.props(styles.logoLink)} href="https://vite.dev" target="_blank" rel="noreferrer">
          <img {...cssx.props(styles.logo)} src="/vite.svg" alt="Vite logo" />
        </a>
        <a {...cssx.props(styles.logoLink)} href="https://solidjs.com" target="_blank" rel="noreferrer">
          <img {...cssx.props(styles.logo)} src={solidLogo} alt="Solid logo" />
        </a>
