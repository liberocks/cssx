export interface DocCodeBlock {
  code: string;
  lang: string;
}

export const docExamples = {
  'getting-started/quick-start': [
    {
      code: 'pnpm add @cssxio/cssx @cssxio/unplugin',
      lang: 'sh',
    },
    {
      code: "import cssx from '@cssxio/unplugin/vite';\nimport { defineConfig } from 'vite';\n\nexport default defineConfig({\n  plugins: [cssx({ cssFileName: 'assets/cssx.css' })],\n});",
      lang: 'ts',
    },
    {
      code: "import { sx } from '@cssxio/cssx';\n\nexport function Button() {\n  return (\n    <button className={sx('rounded-lg bg-blue-600 px-4 py-2 text-white', 'hover:bg-blue-700')}>Save changes</button>\n  );\n}",
      lang: 'tsx',
    },
  ],
  'utilities/arbitrary-declarations': [],
  'utilities/backgrounds-gradients': [
    {
      code: "const styles = cssx.create({\n  banner: 'bg-linear-to-r/oklch from-blue-500 via-violet-500 to-pink-500 bg-[linear-gradient(to right,red,blue)] bg-cover',\n});\n\n<section {...cssx.props(styles.banner)} />;",
      lang: 'tsx',
    },
  ],
  'utilities/borders-radii-outlines-rings': [
    {
      code: "const styles = cssx.create({\n  panel: 'border border-blue-500 rounded-lg outline outline-2 outline-blue-500 ring-2 ring-blue-500/50',\n});\n\n<section {...cssx.props(styles.panel)} />;",
      lang: 'tsx',
    },
  ],
  'utilities/colors': [
    {
      code: 'const styles = cssx.create({\n  input: \'bg-blue-600 text-white border-blue-700/50 placeholder-slate-500\',\n});\n\n<input {...cssx.props(styles.input)} placeholder="Project name" />;',
      lang: 'tsx',
    },
  ],
  'utilities/composition': [
    {
      code: "const styles = cssx.create({\n  base: 'px-4 scale-95',\n  override: 'pr-2 scale-x-105',\n});\n\n<div {...cssx.props(styles.base, styles.override)} />;",
      lang: 'tsx',
    },
  ],
  'utilities/containment-rendering': [
    {
      code: 'const styles = cssx.create({\n  logo: \'[mask-type:luminance] text-[14px] contain-[layout paint] bg-[url("/hero.svg")]\',\n});\n\n<div {...cssx.props(styles.logo)} />;',
      lang: 'tsx',
    },
  ],
  'utilities/display-and-visibility': [
    {
      code: "const styles = cssx.create({\n  label: 'sr-only',\n  menu: 'hidden md:flex',\n});\n\n<>\n  <span {...cssx.props(styles.label)}>Navigation</span>\n  <nav {...cssx.props(styles.menu)} />\n</>;",
      lang: 'tsx',
    },
  ],
  'utilities/effects-filters-masks': [
    {
      code: 'const styles = cssx.create({\n  portrait: \'shadow-md opacity-90 blur-sm backdrop-blur-md mask-[url("/mask.svg")] mask-cover\',\n});\n\n<img {...cssx.props(styles.portrait)} alt="" />;',
      lang: 'tsx',
    },
  ],
  'utilities/flexbox-alignment': [
    {
      code: "const styles = cssx.create({\n  toolbar: 'flex flex-col md:flex-row items-center justify-between gap-4',\n  search: 'basis-1/2 grow',\n});\n\n<div {...cssx.props(styles.toolbar)}>\n  <input {...cssx.props(styles.search)} />\n</div>;",
      lang: 'tsx',
    },
  ],
  'utilities/general-layout': [
    {
      code: 'const styles = cssx.create({\n  image: \'columns-3 break-inside-avoid overflow-x-auto object-cover object-center\',\n});\n\n<img {...cssx.props(styles.image)} alt="" />;',
      lang: 'tsx',
    },
  ],
  'utilities/grid': [
    {
      code: "const styles = cssx.create({\n  gallery: 'grid grid-cols-3 grid-flow-row-dense auto-rows-fr gap-4',\n  feature: 'col-span-2 row-start-3',\n});\n\n<div {...cssx.props(styles.gallery)}>\n  <article {...cssx.props(styles.feature)} />\n</div>;",
      lang: 'tsx',
    },
  ],
  'utilities/interaction-form-controls': [
    {
      code: "const styles = cssx.create({\n  textarea: 'cursor-text touch-manipulation select-none accent-blue-500 appearance-none resize-y',\n});\n\n<textarea {...cssx.props(styles.textarea)} />;",
      lang: 'tsx',
    },
  ],
  'utilities/position-sizing': [
    {
      code: "const styles = cssx.create({\n  media: 'relative inset-s-4 top-2 z-10 inline-full max-inline-lg aspect-video',\n});\n\n<video {...cssx.props(styles.media)} />;",
      lang: 'tsx',
    },
  ],
  'utilities/scrolling-scrollbars': [
    {
      code: "const styles = cssx.create({\n  gallery: 'overflow-x-auto scroll-smooth snap-x snap-mandatory snap-always scrollbar-thin scrollbar-thumb-slate-500',\n});\n\n<div {...cssx.props(styles.gallery)} />;",
      lang: 'tsx',
    },
  ],
  'utilities/spacing': [
    {
      code: "const styles = cssx.create({\n  card: 'px-4 py-2 -mt-2',\n  stack: 'space-y-2',\n});\n\n<section {...cssx.props(styles.card)}>\n  <div {...cssx.props(styles.stack)} />\n</section>;",
      lang: 'tsx',
    },
  ],
  'utilities/svg-forced-colors': [
    {
      code: 'const styles = cssx.create({\n  icon: \'fill-blue-500 stroke-white stroke-[1.5px] forced-color-adjust-auto\',\n});\n\n<svg {...cssx.props(styles.icon)} aria-hidden="true" />;',
      lang: 'tsx',
    },
  ],
  'utilities/syntax-and-values': [
    {
      code: "const styles = cssx.create({\n  card: 'sm:!-mt-2 bg-position-(--hero-position)',\n});\n\n<article {...cssx.props(styles.card)} />;",
      lang: 'tsx',
    },
  ],
  'utilities/tables': [
    {
      code: "const styles = cssx.create({\n  report: 'border-separate border-spacing-x-4 border-spacing-y-2 table-fixed',\n});\n\n<table {...cssx.props(styles.report)} />;",
      lang: 'tsx',
    },
  ],
  'utilities/transitions-animation-transforms': [
    {
      code: "const styles = cssx.create({\n  button: 'transition-transform-opacity duration-normal ease-spring-snappy hover:scale-105',\n  dialog: 'open:starting:opacity-0 open:starting:translate-y-2 motion-reduce:duration-instant',\n});\n\n<button {...cssx.props(styles.button)}>Save</button>;",
      lang: 'tsx',
    },
  ],
  'utilities/typography': [
    {
      code: "const styles = cssx.create({\n  title: 'font-sans text-lg font-semibold leading-tight tracking-wide tabular-nums',\n  required: \"before:content-['required'] before:text-red-600\",\n});\n\n<h2 {...cssx.props(styles.title, styles.required)}>Invoice 0042</h2>;",
      lang: 'tsx',
    },
  ],
  'utilities/variants': [
    {
      code: 'const styles = cssx.create({\n  trigger: \'sm:hover:bg-blue-600 group-focus:text-white data-[state=open]:block [&>svg]:size-4\',\n});\n\n<button {...cssx.props(styles.trigger)} data-state="open">\n  <svg />\n</button>;',
      lang: 'tsx',
    },
  ],
} satisfies Record<string, DocCodeBlock[]>;
