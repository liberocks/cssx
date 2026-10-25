import * as cssx from '@cssxio/cssx';

const styles = cssx.create({
  prose:
    'max-w-4xl text-base leading-relaxed text-gray-700 dark:text-gray-300 [& h1]:text-gray-900 [& h2]:text-gray-900 [& h3]:text-gray-900 dark:[& h1]:text-gray-50 dark:[& h2]:text-gray-50 dark:[& h3]:text-gray-50 [& h1]:leading-tight [& h2]:leading-tight [& h3]:leading-tight [& h1]:scroll-mt-6 [& h2]:scroll-mt-6 [& h3]:scroll-mt-6 [& h1]:mb-3 [& h1]:text-3xl [& h1]:tracking-tight md:[& h1]:text-4xl [& h2]:mt-10 [& h2]:mb-3 [& h2]:text-2xl [& h2]:tracking-tight [& h3]:mt-7 [& h3]:mb-2 [& h3]:text-lg [& p]:my-4 [& ul]:my-4 [& ol]:my-4 [& :not(pre)>code]:rounded [& :not(pre)>code]:bg-blue-50 [& :not(pre)>code]:px-1 [& :not(pre)>code]:py-px [& :not(pre)>code]:text-sm [& :not(pre)>code]:text-brand dark:[& :not(pre)>code]:bg-blue-500 dark:[& :not(pre)>code]:text-blue-300 [& pre]:max-w-full [& pre]:overflow-auto [& pre]:rounded-xl [& pre]:border [& pre]:border-gray-200 [& pre]:bg-gray-50 [& pre]:px-5 [& pre]:py-4 [& pre]:text-sm [& pre]:leading-relaxed dark:[& pre]:border-gray-700 dark:[& pre]:bg-neutral-900 [& table]:my-5 [& table]:block [& table]:max-w-full [& table]:overflow-auto [& table]:border-collapse [& table]:text-sm [& table]:leading-normal [& th]:border-b [& td]:border-b [& th]:border-gray-200 [& td]:border-gray-200 [& th]:px-3 [& td]:px-3 [& th]:py-3 [& td]:py-3 [& th]:text-left [& td]:text-left [& th]:[vertical-align:top] [& td]:[vertical-align:top] [& th]:text-gray-900 [& th]:font-semibold dark:[& th]:text-gray-50 dark:[& th]:border-gray-700 dark:[& td]:border-gray-700 [& blockquote]:my-5 [& blockquote]:border-l-4 [& blockquote]:border-gray-300 [& blockquote]:pl-4 [& blockquote]:text-gray-600 dark:[& blockquote]:border-gray-700 dark:[& blockquote]:text-gray-300',
  content: '[& a]:text-brand [& a]:underline [& a]:underline-offset-1',
  homeLinks:
    'mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 [& a]:flex [& a]:flex-col [& a]:gap-1 [& a]:rounded-xl [& a]:border [& a]:border-gray-200 [& a]:p-4 [& a]:text-inherit [& a]:no-underline [& a:hover]:border-gray-400 [& a:hover]:bg-gray-50 dark:[& a]:border-gray-800 dark:[& a:hover]:bg-neutral-900 [& strong]:text-base [& strong]:text-gray-900 [& span]:text-sm [& span]:leading-normal [& span]:text-gray-500 dark:[& strong]:text-gray-50 dark:[& span]:text-gray-400',
});

export const docsStyleProps = {
  prose: cssx.props(styles.prose),
  content: cssx.props(styles.content),
  homeLinks: cssx.props(styles.homeLinks),
};
