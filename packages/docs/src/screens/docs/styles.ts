import * as cssx from '@cssxio/cssx';

export const styles = cssx.create({
  page: 'relative max-w-full mx-auto md:max-w-7xl min-h-screen flex flex-col p-4',
  header: 'absolute inset-x-4 top-2 z-10 flex min-h-11 items-center justify-between lg:top-4 lg:min-h-8',
  toggles: 'ml-auto flex shrink-0 items-center justify-end gap-2 sm:gap-4',
  mobileHomeLink: 'flex h-11 items-center lg:hidden',
  main: 'flex flex-row gap-0 justify-start flex-1 min-h-0 px-0 sm:px-2 lg:gap-10 lg:px-4',
  logo: 'w-auto h-6 opacity-80 dark:invert',
  content: 'flex-1 min-w-0 max-w-3xl pt-16 lg:pt-12',
  toc: 'hidden min-[84rem]:block w-44 shrink-0 sticky top-16 self-start',
  tocHeading: 'sr-only',
  tocList: 'flex flex-col items-start text-sm text-gray-500 dark:text-gray-400 leading-[1.375rem]',
  tocNestedList: 'flex flex-col items-start pl-3',
  tocLink: 'flex py-[0.1875rem] px-2 -mx-2 rounded-md hover:underline hover:decoration-gray-300 hover:decoration-[1px] hover:underline-offset-2 dark:hover:decoration-gray-600',
});
