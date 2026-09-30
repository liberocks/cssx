import * as cssx from '@cssxio/cssx';

export const styles = cssx.create({
  desktop: 'hidden lg:flex w-52 shrink-0 sticky top-4 self-start flex-col overflow-hidden',
  homeLink: 'flex items-center h-8 shrink-0 mb-4',
  logo: 'w-auto h-6 opacity-80 dark:invert',
  scrollArea: 'relative flex-1 min-h-0 overflow-hidden pt-5',
  navigation: 'flex flex-col gap-5 h-full overflow-y-auto overscroll-y-contain scrollbar-none [&::-webkit-scrollbar]:hidden',
  section: 'flex flex-col gap-0 mb-4',
  heading: 'text-xs uppercase text-gray-500 dark:text-gray-400 -translate-y-[2px]',
  link: 'box-border block py-0.5 px-2 -ml-2 border-y border-transparent rounded-md bg-transparent text-sm text-gray-700 leading-[1.375rem] hover:bg-transparent hover:underline hover:decoration-gray-400 hover:decoration-[1px] hover:underline-offset-2 dark:text-gray-200 dark:hover:decoration-gray-500',
  scrollbar:
    'absolute inset-y-0 right-0 flex w-6 py-1 opacity-0 pointer-events-none transition-opacity duration-200 delay-500 data-scrolling:opacity-100 data-scrolling:duration-0 data-scrolling:delay-0',
  scrollbarThumb:
    'flex w-full justify-center before:block before:w-1 before:h-full before:rounded-full before:bg-gray-400 dark:before:bg-gray-600',
  footer: 'mt-3 flex shrink-0 flex-col items-start gap-2 border-t border-gray-200 pt-5 dark:border-gray-800',
  footerLink: 'flex items-center gap-2 text-xs text-gray-500 hover:underline hover:decoration-gray-400 hover:decoration-[1px] hover:underline-offset-2 dark:text-gray-400 dark:hover:decoration-gray-500',
  footerIcon: 'h-4 w-4 shrink-0',
  mobileTrigger: 'flex h-11 items-center rounded-md px-2 text-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 lg:hidden',
  mobileSheet: 'fixed top-auto bottom-0 m-0 box-border h-[calc(100dvh-0.25rem)] max-h-[calc(100dvh-0.25rem)] w-full max-w-none rounded-2xl border-x-0 border-b-0 border-gray-200 bg-white p-0 text-gray-900 shadow-2xl outline-none  dark:border-gray-800 dark:bg-gray-950 dark:text-gray-50 [&::backdrop]:bg-black/10 dark:[&::backdrop]:bg-black/40 lg:hidden',
  mobileSheetContent: 'flex h-full min-h-0 flex-col overflow-hidden',
  sheetTitle: 'sr-only',
  mobileSearchHeader: 'relative shrink-0 px-4 pt-4',
  sheetHandle: 'absolute top-1 left-1/2 h-1.5 w-14 -translate-x-1/2 rounded-full bg-gray-300 dark:bg-gray-700',
  mobileSearchInput: 'block h-10 w-full rounded-full border-0 bg-gray-100 px-3 text-sm text-gray-900 outline-none placeholder:text-gray-500 dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-400',
  mobileNavigation: 'flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain px-7 pt-4 pb-[max(4rem,env(safe-area-inset-bottom))]',
  mobileSection: 'flex flex-col mb-6',
  mobileHeading: 'mb-2 text-sm text-gray-500 dark:text-gray-400',
  mobileLink: 'flex h-10 items-center -mx-7 px-7 text-sm text-gray-800 hover:underline hover:decoration-gray-400 hover:decoration-[1px] hover:underline-offset-2 dark:text-gray-100 dark:hover:decoration-gray-500',
});
