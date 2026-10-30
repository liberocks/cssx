import * as cssx from '@cssxio/cssx';

const styles = cssx.create({
  prose:
    'max-w-4xl leading-relaxed text-base text-gray-700 md:[& h1]:text-4xl dark:text-gray-300 dark:[& :not(pre)>code]:text-blue-300 dark:[& :not(pre)>code]:bg-blue-500 dark:[& blockquote]:text-gray-300 dark:[& blockquote]:border-gray-700 dark:[& h1]:text-gray-50 dark:[& h2]:text-gray-50 dark:[& h3]:text-gray-50 dark:[& pre]:border-gray-700 dark:[& pre]:bg-neutral-900 dark:[& td]:border-gray-700 dark:[& th]:text-gray-50 dark:[& th]:border-gray-700 [& :not(pre)>code]:px-1 [& :not(pre)>code]:py-px [& :not(pre)>code]:text-sm [& :not(pre)>code]:text-brand [& :not(pre)>code]:rounded [& :not(pre)>code]:bg-blue-50 [& blockquote]:my-5 [& blockquote]:pl-4 [& blockquote]:text-gray-600 [& blockquote]:border-l-4 [& blockquote]:border-gray-300 [& h1]:scroll-mt-6 [& h1]:mb-3 [& h1]:leading-tight [& h1]:tracking-tight [& h1]:text-3xl [& h1]:text-gray-900 [& h2]:scroll-mt-6 [& h2]:mt-10 [& h2]:mb-3 [& h2]:leading-tight [& h2]:tracking-tight [& h2]:text-2xl [& h2]:text-gray-900 [& h3]:scroll-mt-6 [& h3]:mt-7 [& h3]:mb-2 [& h3]:leading-tight [& h3]:text-lg [& h3]:text-gray-900 [& ol]:my-4 [& p]:my-4 [& pre]:overflow-auto [& pre]:max-w-full [& pre]:px-5 [& pre]:py-4 [& pre]:leading-relaxed [& pre]:text-sm [& pre]:rounded-xl [& pre]:border-gray-200 [& pre]:border [& pre]:bg-gray-50 [& table]:block [& table]:overflow-auto [& table]:max-w-full [& table]:my-5 [& table]:leading-normal [& table]:text-sm [& table]:border-collapse [& td]:px-3 [& td]:py-3 [& td]:[vertical-align:top] [& td]:text-left [& td]:border-b [& td]:border-gray-200 [& th]:px-3 [& th]:py-3 [& th]:[vertical-align:top] [& th]:font-semibold [& th]:text-left [& th]:text-gray-900 [& th]:border-b [& th]:border-gray-200 [& ul]:my-4',
  content: '[& a]:underline-offset-1 [& a]:text-brand [& a]:underline',
  homeLinks:
    'grid grid-cols-1 gap-3 mt-6 md:grid-cols-2 lg:grid-cols-3 dark:[& a:hover]:bg-neutral-900 dark:[& a]:border-gray-800 dark:[& span]:text-gray-400 dark:[& strong]:text-gray-50 [& a:hover]:border-gray-400 [& a:hover]:bg-gray-50 [& a]:flex [& a]:flex-col [& a]:gap-1 [& a]:p-4 [& a]:text-inherit [& a]:no-underline [& a]:rounded-xl [& a]:border-gray-200 [& a]:border [& span]:leading-normal [& span]:text-sm [& span]:text-gray-500 [& strong]:text-base [& strong]:text-gray-900',
});

export const docsStyleProps = {
  prose: cssx.props(styles.prose),
  content: cssx.props(styles.content),
  homeLinks: cssx.props(styles.homeLinks),
};
