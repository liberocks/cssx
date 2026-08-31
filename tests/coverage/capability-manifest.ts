/**
 * One representative from every documented CSSX utility family, plus all
 * runtime API forms and variant groups. The compiler's unit suite is the
 * exhaustive per-utility contract; this manifest keeps visual coverage broad
 * without turning the page into an unreadable catalogue of thousands of rows.
 */
export const capabilityGroups = {
  syntax: ['!-mt-2', 'w-[17rem]', 'bg-position-(--hero-position)', '[mask-type:luminance]'],
  display: ['flex', 'grid', 'flow-root', 'table', 'invisible', 'sr-only'],
  layout: ['columns-3', 'break-inside-avoid', 'box-border', 'overflow-x-auto', 'object-cover'],
  sizing: ['relative', 'inset-s-4', 'z-10', 'size-12', 'aspect-video', 'container'],
  tables: ['border-separate', 'border-spacing-x-4', 'table-fixed', 'caption-bottom'],
  flexAndGrid: ['flex-col', 'items-center', 'justify-between', 'grid-cols-3', 'col-span-2', 'auto-rows-fr'],
  spacing: ['p-4', '-mt-2', 'gap-4', 'space-x-2', 'divide-x-2'],
  typography: ['font-semibold', 'text-xl', 'underline', 'decoration-wavy', 'line-clamp-3', 'tabular-nums'],
  colors: ['bg-slate-900', 'text-white', 'border-blue-500/50', 'accent-blue-500'],
  backgrounds: ['bg-linear-to-r', 'from-blue-500', 'via-violet-500', 'to-fuchsia-500', 'bg-cover'],
  bordersAndEffects: ['rounded-lg', 'border-2', 'outline-offset-2', 'ring-2', 'shadow-lg', 'opacity-80'],
  filtersAndMasks: ['blur-sm', 'backdrop-blur-sm', 'filter-none', 'mask-[url("/mask.svg")]'],
  motion: [
    'transition',
    'transition-transform-opacity',
    'duration-normal',
    '-delay-75',
    'ease-spring-snappy',
    'animate-fade-in',
    'animation-name-shimmer',
    'animation-duration-500',
    'animation-composition-add',
    'stagger-normal',
    'stagger-index-2',
    'delay-stagger',
    'animation-timeline-view-block',
    'animation-range-entry',
    'view-transition-name-[coverage-card]',
    'rotate-6',
    'translate-x-2',
    'scale-105',
  ],
  interaction: ['cursor-pointer', 'select-none', 'touch-pan-x', 'appearance-none', 'caret-red-500'],
  scrolling: ['scroll-smooth', 'snap-x', 'snap-mandatory', 'scrollbar-thin', 'scroll-mt-4'],
  svgAndRendering: ['fill-current', 'stroke-current', 'stroke-2', 'forced-color-adjust-none', 'writing-vertical-rl'],
  containment: ['content-visibility-auto', 'contain-content', 'contain-intrinsic-size-[auto_800px]'],
  variants: [
    'hover:bg-blue-600',
    'focus-visible:ring-2',
    'sm:grid-cols-2',
    'dark:text-white',
    'motion-safe:animate-pulse',
    'motion-reduce:duration-instant',
    'starting:opacity-0',
    'vt-old-[coverage-card]:opacity-0',
    'data-[state=open]:bg-violet-500',
    'aria-disabled:opacity-50',
    'group-hover:scale-105',
    'peer-checked:text-blue-600',
    'has-checked:ring-2',
    'before:content-[\'new\']',
    '[&>svg]:size-4',
    'supports-[display:grid]:grid',
  ],
} as const;

export const capabilityCandidates = Object.freeze(Object.values(capabilityGroups).flat());
