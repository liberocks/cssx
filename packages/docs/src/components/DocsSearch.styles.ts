import * as cssx from '@cssxio/cssx';

export const styles = cssx.create({
  trigger: 'outline-none flex h-11 items-center gap-2 rounded-md text-sm lg:text-base text-gray-700 dark:text-gray-200',
  shortcut: 'hidden min-[48rem]:inline-flex rounded border border-gray-300 px-1 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400',
  dialog: 'm-auto w-[calc(100%-2rem)] max-w-xl rounded-xl border border-gray-200 bg-white p-0 text-gray-900 shadow-2xl outline-none dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 [&::backdrop]:bg-black/20 dark:[&::backdrop]:bg-black/50',
  content: 'flex max-h-[min(32rem,calc(100dvh-2rem))] flex-col overflow-hidden',
  searchRow: 'flex min-h-14 items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-800',
  input: 'min-w-0 flex-1 bg-transparent text-base text-gray-900 outline-none placeholder:text-gray-500 dark:text-gray-50 dark:placeholder:text-gray-400',
  closeButton: 'flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 active:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-800',
  closeIcon: 'h-5 w-5',
  results: 'flex flex-col overflow-y-auto p-2',
  result: 'flex rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
  empty: 'px-3 py-8 text-center text-sm text-gray-500 dark:text-gray-400',
});
