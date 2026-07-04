import * as cssx from '@cssxio/cssx';

const styles = cssx.create({
  page: 'relative flex min-h-[100vh] items-center justify-center p-6 font-[var(--font-display)]',
  background: 'absolute top-0 left-0 h-full w-full object-cover',
  hero: 'relative flex max-w-xl flex-col items-start gap-6',
  title: 'text-2xl font-semibold text-slate-900',
  code: 'rounded-md bg-brand px-2 py-1 text-white',
  links: 'flex flex-wrap items-center gap-3',
  primaryLink: 'rounded-md bg-brand px-4 py-2 font-medium text-white shadow-md hover:bg-blue-700',
  secondaryLink: 'rounded-md px-4 py-2 text-slate-700 hover:text-brand',
  note: 'text-sm text-slate-600',
});

export const styleProps = {
  page: cssx.props(styles.page),
  background: cssx.props(styles.background),
  hero: cssx.props(styles.hero),
  title: cssx.props(styles.title),
  code: cssx.props(styles.code),
  links: cssx.props(styles.links),
  primaryLink: cssx.props(styles.primaryLink),
  secondaryLink: cssx.props(styles.secondaryLink),
  note: cssx.props(styles.note),
};
