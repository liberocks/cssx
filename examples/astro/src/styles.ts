import * as cssx from '@cssxio/cssx';

const styles = cssx.create({
  page: 'flex relative justify-center items-center min-h-[100vh] p-6 font-[var(--font-display)]',
  background: 'object-cover absolute w-full h-full top-0 left-0',
  hero: 'flex relative items-start flex-col max-w-xl gap-6',
  title: 'text-2xl font-semibold text-slate-900',
  code: 'px-2 py-1 text-white rounded-md bg-brand',
  links: 'flex items-center flex-wrap gap-3',
  primaryLink: 'px-4 py-2 font-medium text-white rounded-md bg-brand shadow-md hover:bg-blue-700',
  secondaryLink: 'px-4 py-2 text-slate-700 rounded-md hover:text-brand',
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
