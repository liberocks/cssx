import Image from 'next/image';
import { sx } from '@cssxio/cssx';
import * as cssx from '@cssxio/cssx';
import { ClientCssx } from './client-cssx';

const styles = cssx.create({
  page: 'flex min-h-[100vh] items-center justify-center bg-slate-100 p-6 font-[var(--font-display)]',
  main: 'flex min-h-[100vh] w-full max-w-3xl flex-col items-start justify-between gap-12 bg-white p-12',
  logo: 'h-5 w-auto',
  intro: 'flex max-w-lg flex-col items-start gap-6 text-left',
  title: 'text-[2.5rem] leading-[1.2] font-semibold text-slate-950',
  copy: 'text-lg text-slate-600',
  inlineLink: 'font-medium text-slate-950 hover:text-brand',
  ctas: 'flex flex-wrap gap-4 text-sm',
  secondary: 'rounded-full border border-slate-200 px-4 py-3 font-medium text-slate-950 hover:bg-slate-100',
});

export default function Page() {
  return (
    <div {...cssx.props(styles.page)}>
      <main {...cssx.props(styles.main)}>
        <span data-cssx-server className={sx('hidden bg-red-500')} />
        <ClientCssx />
        <Image {...cssx.props(styles.logo)} src="/next.svg" alt="Next.js logo" width={100} height={20} priority />
        <div {...cssx.props(styles.intro)}>
          <h1 {...cssx.props(styles.title)}>To get started, edit the page.tsx file.</h1>
          <p {...cssx.props(styles.copy)}>
            Looking for a starting point or more instructions? Head over to{' '}
            <a {...cssx.props(styles.inlineLink)} href="https://nextjs.org/learn">
              the learning center
            </a>
            .
          </p>
        </div>
        <div {...cssx.props(styles.ctas)}>
          <a
            className={sx(
              'flex items-center justify-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-medium text-white hover:bg-slate-800',
            )}
            href="https://vercel.com/new"
          >
            <Image src="/vercel.svg" alt="Vercel logomark" width={16} height={16} />
            Deploy Now
          </a>
          <a {...cssx.props(styles.secondary)} href="https://nextjs.org/docs">
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
