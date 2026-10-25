import type { DocMetadata } from './catalog.ts';

export const docsMetadata: Record<string, DocMetadata> = {
  'getting-started/quick-start': {
    title: 'Quick start',
    description: 'Install CSSX, enable the build plugin, and write your first static utility styles.',
    section: 'Start here',
    order: 0,
    keywords: ['install', 'setup', 'vite', 'plugin', 'sx', 'cssx.create'],
    headings: [
      {
        depth: 2,
        slug: 'install',
        text: 'Install',
      },
      {
        depth: 2,
        slug: 'enable-the-vite-plugin',
        text: 'Enable the Vite plugin',
      },
      {
        depth: 2,
        slug: 'add-utilities-to-a-component',
        text: 'Add utilities to a component',
      },
    ],
    searchText:
      "cssx turns static utility strings into generated css during your build. start with the runtime package and the plugin for your bundler. install pnpm add @cssxio/cssx @cssxio/unplugin enable the vite plugin import cssx from '@cssxio/unplugin/vite'; import { defineconfig } from 'vite'; export default defineconfig({ plugins: [cssx({ cssfilename: 'assets/cssx.css' })], }); the plugin finds static cssx strings, compiles the utilities, and emits the stylesheet as part of the build. add utilities to a component import { sx } from '@cssxio/cssx'; export function button() { return ( <button classname={sx('rounded-lg bg-blue-600 px-4 py-2 text-white', 'hover:bg-blue-700')}>save changes</button> ); } use sx to join static utility strings and runtime conditions. cssx compiles the static strings; runtime values are joined as class names. see utility syntax and variants for the full reference.",
  },
  'utilities/arbitrary-declarations': {
    title: 'Arbitrary declarations',
    description: 'Validated property/value syntax for one-off static declarations.',
    section: 'Utilities',
    order: 18,
    keywords: ['arbitrary properties', 'declaration', 'property value'],
    headings: [],
    searchText:
      'class styles [property:value] one validated declaration. custom properties are supported. text-[length] font-size when the value is recognized as a length. text-[color] text color when the value resolves as a color. bg-[image] background-image when the value is a supported image function. bg-[color] background color when the value resolves as a color. semicolons, braces, malformed nesting, and unsafe property names are rejected.',
  },
  'utilities/backgrounds-gradients': {
    title: 'Backgrounds and gradients',
    description: 'Background image, size, position, repeat, attachment, and gradients.',
    section: 'Utilities',
    order: 11,
    keywords: ['background', 'gradient', 'image', 'color stop'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      "class styles bg-none, bg-[image] background-image. bg-{auto,cover,contain} background-size. bg-{top-left,top,top-right,left,center,right,bottom-left,bottom,bottom-right} background-position. bg-{repeat,no-repeat,repeat-x,repeat-y,repeat-round,repeat-space} background-repeat. bg-{fixed,local,scroll} background-attachment. bg-clip-{border,padding,content,text}, bg-origin-{border,padding,content} background clip or origin. bg-position-[value], bg-position-(--property), bg-size-[value], bg-size-(--property) custom position or size. bg-linear-to-{t,tr,r,br,b,bl,l,tl} directional linear-gradient(). bg-linear-{angle,[angle]} angled linear-gradient(). from/via/to-<color>, from/via/to-<0..100%> composable gradient color and stop-position channels. write spaces directly in bracketed values; unescaped underscores remain a whitespace alias for compatibility. example const styles = cssx.create({ banner: 'bg-linear-to-r/oklch from-blue-500 via-violet-500 to-pink-500 bg-cover', }); <section {...cssx.props(styles.banner)} />;",
  },
  'utilities/borders-radii-outlines-rings': {
    title: 'Borders, radii, outlines, and rings',
    description: 'Border widths, dividers, radii, outlines, and composable rings.',
    section: 'Utilities',
    order: 12,
    keywords: ['border', 'radius', 'outline', 'ring', 'divide'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      "class styles border, border-{0,2,4,8} all-side border width. border-{x,y,t,r,b,l}, border-{x,y,t,r,b,l}-{0,2,4,8} selected border width. rounded, rounded-{none,sm,md,lg,xl,2xl,full} border-radius. divide-{x,y}[-{0,2,4,8,[value]}] child-scoped divider widths. divide-{x,y}-reverse reverses divider direction. outline solid 1px outline. outline-{none,hidden,solid,dashed,dotted,double} outline style or reset. outline-{0,1,2,4,8,[value]}, outline-offset-<spacing> outline width or offset. ring, ring-{0,2,4,8,[value]} composable ring width and shadow. ring-offset-{0,2,4,8,[value]} ring offset width. color forms are documented in colors. dividers apply to every child except the last, and rings compose with regular shadows. example const styles = cssx.create({ panel: 'border border-blue-500 rounded-lg outline outline-2 outline-blue-500 ring-2 ring-blue-500/50', }); <section {...cssx.props(styles.panel)} />;",
  },
  'utilities/colors': {
    title: 'Colors',
    description: 'Text, background, border, outline, SVG, and control colors.',
    section: 'Utilities',
    order: 10,
    keywords: ['color', 'palette', 'opacity', 'bg color', 'text color'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      'class styles bg-<color>, text-<color>, border-<color> background, foreground, or border color. outline-<color>, divide-<color>, placeholder-<color> outline, child divider, or placeholder color. accent-<color>, caret-<color> accent or caret color. fill-<color>, stroke-<color> svg paint color. ring-<color>, ring-offset-<color> ring or ring-offset color channel. <color-utility>/<0..100> or <color-utility>/[number] applies color opacity with color-mix(). the default palette has 50-950 shades for red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose, slate, gray, zinc, neutral, stone, mauve, olive, mist, taupe, steel, brown, vermilion, mint, azure, and amethyst, plus black, white, and transparent. every family name works in every color utility, such as bg-vermilion-500, text-steel-950, and border-mint-200. example const styles = cssx.create({ input: \'bg-blue-600 text-white border-blue-700/50 placeholder-slate-500\', }); <input {...cssx.props(styles.input)} placeholder="project name" />;',
  },
  'utilities/composition': {
    title: 'Composition',
    description: 'How compiled CSSX styles merge and resolve conflicting utility channels.',
    section: 'Advanced',
    order: 22,
    keywords: ['composition', 'merge', 'conflicts', 'cascade'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      "cssx stores the style groups that each compiled style changes. the browser can then merge compiled styles without reading utility syntax. composition result broad directional utility followed by a narrower one only the overlapping declaration atom is replaced. same semantic write group the later compiled style wins. logical and physical writes remain independently composable. filters, backdrop filters, transforms, gradients, and rings their channels compose independently. normal-nums, filter-none, backdrop-filter-none reset all related channels. space-* and divide-* remain a child-selector-scoped atom. example const styles = cssx.create({ base: 'px-4 scale-95', override: 'pr-2 scale-x-105', }); <div {...cssx.props(styles.base, styles.override)} />; create input is intentionally static. dynamic utility strings should remain raw class strings or be modeled as explicit static style choices.",
  },
  'utilities/containment-rendering': {
    title: 'Containment and rendering',
    description: 'Content visibility, containment, intrinsic sizes, and image rendering.',
    section: 'Utilities',
    order: 19,
    keywords: ['containment', 'content visibility', 'intrinsic size', 'rendering'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      'class styles content-visibility-{visible,auto,hidden} content-visibility. contain-{none,content,strict,size,inline-size,layout,style,paint}, contain-[value] css containment. CSS containment, such as contain-[layout paint]. contain-intrinsic-{size,inline-size,block-size}-{n,[value],(--property)} intrinsic fallback size for contained content. image-render-{auto,crisp-edges,pixelated} image interpolation behavior. example const styles = cssx.create({ logo: \'[mask-type:luminance] text-[14px] bg-[url("/hero.svg")]\', }); <div {...cssx.props(styles.logo)} />;',
  },
  'utilities/display-and-visibility': {
    title: 'Display and visibility',
    description: 'Display modes, visibility, table display, and screen-reader-only helpers.',
    section: 'Utilities',
    order: 2,
    keywords: ['display', 'visibility', 'block', 'inline', 'hidden', 'screen reader'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      "class styles block, inline-block, inline, flex, inline-flex, grid, inline-grid corresponding display value. flow-root, contents, list-item, hidden display: flow-root, contents, list-item, or none. table, inline-table, table-{caption,cell,column,column-group,footer-group,header-group,row,row-group} corresponding table display value. visible, invisible visibility: visible or hidden. sr-only, not-sr-only applies or resets the screen-reader-only clipping declarations. example const styles = cssx.create({ label: 'sr-only', menu: 'hidden md:flex', }); <> <span {...cssx.props(styles.label)}>navigation</span> <nav {...cssx.props(styles.menu)} /> </>;",
  },
  'utilities/effects-filters-masks': {
    title: 'Effects, filters, and masks',
    description: 'Shadows, opacity, filters, backdrop filters, and masks.',
    section: 'Utilities',
    order: 13,
    keywords: ['effects', 'shadow', 'opacity', 'filter', 'blur', 'mask'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      'class styles shadow, shadow-{sm,md,lg,xl,none} composable box-shadow channel. opacity-<n> opacity: n / 100. filter-none resets filter channels. blur-{none,xs,sm,md,lg,xl,2xl,3xl,[value]} composable blur(). brightness-*, contrast-*, saturate-*, grayscale[-0], hue-rotate-{n,[value]}, invert[-0], sepia[-0], drop-shadow-* composable filter channels. backdrop-filter-none resets backdrop-filter channels. backdrop-{blur,brightness,contrast,grayscale,hue-rotate,invert,opacity,saturate,sepia}-* composable backdrop-filter channels. mask-none, mask-[image], mask-(--property) mask-image. mask-{cover,contain}, mask-{repeat,no-repeat,repeat-x,repeat-y,repeat-round,repeat-space} mask size or repeat. mask-clip-{border,padding,content}, mask-no-clip, mask-origin-{border,padding,content} mask clipping or origin. mask-{position,size}-[value], mask-{position,size}-(--property) custom mask position or size. example const styles = cssx.create({ portrait: \'shadow-md opacity-90 blur-sm backdrop-blur-md mask-[url("/mask.svg")] mask-cover\', }); <img {...cssx.props(styles.portrait)} alt="" />;',
  },
  'utilities/flexbox-alignment': {
    title: 'Flexbox and alignment',
    description: 'Flex direction, wrapping, sizing, alignment, and ordering.',
    section: 'Utilities',
    order: 6,
    keywords: ['flex', 'alignment', 'justify', 'place', 'order'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      "class styles flex-{row,row-reverse,col,col-reverse} flex-direction. flex-{wrap,wrap-reverse,nowrap} flex-wrap. flex-{auto,initial,none} flex: 1 1 auto, 0 1 auto, or none. flex-<n>, flex-<fraction>, flex-[value], flex-(--property) flex shorthand. fractions become a percentage calculation. grow, grow-0, shrink, shrink-0 flex-grow or flex-shrink. basis-<value> flex-basis. order-{first,last,none,n} order. negative numeric forms are supported. items-{start,center,end,stretch,baseline} align-items. self-{auto,start,center,end,stretch,baseline} align-self. justify-{start,center,end,between,around,evenly} justify-content. justify-items-{start,center,end,stretch} justify-items. justify-self-{auto,start,center,end,stretch} justify-self. place-items-{start,center,end,stretch,baseline} place-items. place-self-{auto,start,center,end,stretch} place-self. place-content-{start,center,end,between,around,evenly,stretch} place-content. example const styles = cssx.create({ toolbar: 'flex flex-col md:flex-row items-center justify-between gap-4', search: 'basis-1/2 grow', }); <div {...cssx.props(styles.toolbar)}> <input {...cssx.props(styles.search)} /> </div>;",
  },
  'utilities/general-layout': {
    title: 'General layout',
    description: 'Columns, breaks, overflow, object fitting, floats, and related layout behavior.',
    section: 'Utilities',
    order: 3,
    keywords: ['layout', 'columns', 'overflow', 'object fit', 'float', 'clear'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      'class styles columns-{auto,n,[value],(--property)} columns. break-{before,after}-{auto,avoid,all,avoid-page,page,left,right,column} break-before or break-after. break-inside-{auto,avoid,avoid-page,avoid-column} break-inside. box-{border,content} box-sizing. box-decoration-{slice,clone} box-decoration-break, including the webkit fallback. float-{start,end,left,right,none}, clear-{start,end,left,right,both,none} float or clear. overflow[-x/-y]-{auto,hidden,clip,visible,scroll} overflow, overflow-x, or overflow-y. overscroll[-x/-y]-{auto,contain,none} overscroll-behavior channels. isolate, isolation-auto isolation: isolate or auto. object-{contain,cover,fill,none,scale-down} object-fit. object-{top-left,top,top-right,left,center,right,bottom-left,bottom,bottom-right}, object-[value], object-(--property) object-position. example const styles = cssx.create({ image: \'columns-3 break-inside-avoid overflow-x-auto object-cover object-center\', }); <img {...cssx.props(styles.image)} alt="" />;',
  },
  'utilities/grid': {
    title: 'Grid',
    description: 'Grid templates, spans, line placement, and auto-flow.',
    section: 'Utilities',
    order: 7,
    keywords: ['grid', 'grid template', 'grid flow', 'column span', 'row span'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      "class styles grid-cols-<n>, grid-rows-<n> repeating grid-template-columns or grid-template-rows. grid-{cols,rows}-subgrid a subgrid template. {col,row}-span-<n>, {col,row}-span-full grid-column or grid-row span. {col,row}-{start,end}-{n,auto} grid line placement. grid-flow-{row,col,row-dense,col-dense} grid-auto-flow. auto-{cols,rows}-{auto,min,max,fr} grid-auto-columns or grid-auto-rows. example const styles = cssx.create({ gallery: 'grid grid-cols-3 grid-flow-row-dense auto-rows-fr gap-4', feature: 'col-span-2 row-start-3', }); <div {...cssx.props(styles.gallery)}> <article {...cssx.props(styles.feature)} /> </div>;",
  },
  'utilities/interaction-form-controls': {
    title: 'Interaction and form controls',
    description: 'Cursor, pointer, selection, touch, appearance, and form-control utilities.',
    section: 'Utilities',
    order: 15,
    keywords: ['interaction', 'cursor', 'pointer events', 'touch', 'select', 'appearance', 'form'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      "class styles cursor-{auto,default,pointer,wait,text,move,help,not-allowed,none,context-menu,progress,cell,crosshair,vertical-text,alias,copy,no-drop,grab,grabbing,all-scroll,col-resize,row-resize,n-resize,e-resize,s-resize,w-resize,ne-resize,nw-resize,se-resize,sw-resize,ew-resize,ns-resize,nesw-resize,nwse-resize,zoom-in,zoom-out} cursor. touch-{auto,none,manipulation,pan-x,pan-y,pinch-zoom} touch-action. will-change-{auto,scroll,contents,transform} will-change. pointer-events-{none,auto}, select-{none,text,all,auto} pointer event or text-selection behavior. accent-auto, accent-<color>, caret-auto, caret-<color> accent or caret color. appearance-{auto,none} appearance. scheme-{normal,dark,light,light-dark,only-dark,only-light} color-scheme. field-sizing-content field-sizing: content. resize, resize-{x,y,none} resize behavior. example const styles = cssx.create({ textarea: 'cursor-text touch-manipulation select-none accent-blue-500 appearance-none resize-y', }); <textarea {...cssx.props(styles.textarea)} />;",
  },
  'utilities/position-sizing': {
    title: 'Position, sizing, and aspect ratio',
    description: 'Position, insets, dimensions, aspect ratios, and container widths.',
    section: 'Utilities',
    order: 4,
    keywords: ['position', 'inset', 'width', 'height', 'size', 'aspect ratio', 'container'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      "class styles static, fixed, absolute, relative, sticky position. top/right/bottom/left-<value> corresponding physical inset. inset[-x/-y]-<value> inset, both horizontal sides, or both vertical sides. inset-s-*, start-*, inset-e-*, end-* logical inline insets. z-{n,auto} z-index. w/h/min-w/max-w/min-h/max-h-<value> physical dimensions. inline/min-inline/max-inline-<value> logical inline dimensions. block/min-block/max-block-<value> logical block dimensions. size-<value> sets both width and height. max-{w,inline}-{xs,sm,md,lg,xl,2xl,3xl,4xl,5xl,6xl,7xl} named maximum inline or physical width. aspect-{auto,square,video,[ratio]} aspect-ratio. container width: 100% and active sm through 2xl maximum widths. <value> accepts supported spacing values, auto, full, screen, fractions, and family-specific arbitrary values. logical and physical writes remain independently composable. example const styles = cssx.create({ media: 'relative inset-s-4 top-2 z-10 inline-full max-inline-lg aspect-video', }); <video {...cssx.props(styles.media)} />;",
  },
  'utilities/scrolling-scrollbars': {
    title: 'Scrolling and scrollbars',
    description: 'Scroll margin and padding, behavior, snap, scrollbar, and gutter utilities.',
    section: 'Utilities',
    order: 16,
    keywords: ['scroll', 'scrollbar', 'snap', 'overscroll'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      "class styles scroll-{m,mx,my,mt,mr,mb,ml}-<spacing> physical scroll margin. scroll-{p,px,py,pt,pr,pb,pl}-<spacing> physical scroll padding. scroll-{auto,smooth} scroll-behavior. scrollbar-{auto,thin,none} scrollbar-width. scrollbar-{thumb,track}-<color> composed scrollbar-color channel. scrollbar-gutter-{auto,stable,both} scrollbar-gutter. snap-{none,x,y,both}, snap-{mandatory,proximity} scroll-snap type and strictness. snap-{normal,always} scroll-snap-stop. snap-{start,end,center,align-none} scroll-snap-align. example const styles = cssx.create({ gallery: 'overflow-x-auto scroll-smooth snap-x snap-mandatory snap-always scrollbar-thin scrollbar-thumb-slate-500', }); <div {...cssx.props(styles.gallery)} />;",
  },
  'utilities/spacing': {
    title: 'Spacing',
    description: 'Padding, margins, gaps, and sibling spacing.',
    section: 'Utilities',
    order: 8,
    keywords: ['spacing', 'padding', 'margin', 'gap', 'space'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      "class styles p/px/py/pt/pr/pb/pl/ps/pe-<spacing> physical or logical padding. m/mx/my/mt/mr/mb/ml/ms/me-<spacing> physical or logical margin. margins also accept auto. gap-<spacing>, gap-x-<spacing>, gap-y-<spacing> gap, column-gap, or row-gap. space-x-<spacing>, space-y-<spacing> child margins on every child except the last. space-{x,y}-reverse reverses the matching child-spacing direction. <spacing> accepts px, full, numeric values resolved through --spacing, and supported arbitrary values. negative forms are supported where css accepts them. example const styles = cssx.create({ card: 'px-4 py-2 -mt-2', stack: 'space-y-2', }); <section {...cssx.props(styles.card)}> <div {...cssx.props(styles.stack)} /> </section>;",
  },
  'utilities/svg-forced-colors': {
    title: 'SVG and forced colors',
    description: 'SVG paint and stroke controls, rendering hints, and forced-color behavior.',
    section: 'Utilities',
    order: 17,
    keywords: ['svg', 'fill', 'stroke', 'forced colors'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      'class styles fill-none, fill-<color> svg fill. stroke-none, stroke-<color> svg stroke color. stroke-<n>, stroke-[value] svg stroke-width. stroke-cap-{butt,round,square}, stroke-join-{miter,round,bevel}, stroke-miterlimit-{n,[value],(--property)} svg stroke geometry. stroke-dasharray-{n,[value],(--property)}, stroke-dashoffset-{n,[value],(--property)} svg dash pattern or offset. fill-rule-{nonzero,evenodd}, clip-rule-{nonzero,evenodd} svg fill and clip rules. vector-effect-{none,non-scaling-stroke}, paint-order-{normal,fill,stroke,markers}, shape-rendering-{auto,optimize-speed,crisp-edges,geometric-precision} svg presentation and rendering. forced-color-adjust-{auto,none} forced-color-adjust. example const styles = cssx.create({ icon: \'fill-blue-500 stroke-white stroke-[1.5px] forced-color-adjust-auto\', }); <svg {...cssx.props(styles.icon)} aria-hidden="true" />;',
  },
  'utilities/syntax-and-values': {
    title: 'Syntax and values',
    description: 'How CSSX parses utility strings, values, modifiers, and declarations.',
    section: 'Utility syntax',
    order: 1,
    keywords: ['utility syntax', 'arbitrary values', 'important', 'negative', 'custom properties'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      "cssx checks every utility while building. a bracketed value must be static and safe. an unsupported utility stops the build. the examples below use @cssxio/cssx. class styles -<utility> negates supported spacing, dimensions, order, angles, hue rotation, and scale values. !<utility> or <utility>! marks every declaration emitted by the utility as !important. <family>-[value] provides a validated static arbitrary value for that family. <supported-family>-(--property) uses var(--property) where that family accepts custom properties. [property:value] emits one validated static declaration. example const styles = cssx.create({ card: 'sm:!-mt-2 bg-position-(--hero-position)', }); <article {...cssx.props(styles.card)} />;",
  },
  'utilities/tables': {
    title: 'Tables',
    description: 'Table layout, border spacing, and caption placement.',
    section: 'Utilities',
    order: 5,
    keywords: ['table', 'border spacing', 'caption'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      "class styles border-{collapse,separate} border-collapse. border-spacing-<spacing> border-spacing. border-spacing-x-<spacing>, border-spacing-y-<spacing> composed horizontal or vertical border-spacing. table-{auto,fixed} table-layout. caption-{top,bottom} caption-side. example const styles = cssx.create({ report: 'border-separate border-spacing-x-4 border-spacing-y-2 table-fixed', }); <table {...cssx.props(styles.report)} />;",
  },
  'utilities/transitions-animation-transforms': {
    title: 'Transitions, animation, and transforms',
    description: 'Transition, keyframe animation, timeline, view-transition, and transform utilities.',
    section: 'Utilities',
    order: 14,
    keywords: ['transition', 'animation', 'transform', 'timeline', 'view transition'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      "class styles transition, transition-{none,all,colors,opacity,shadow,transform,transform-opacity,filter,size,[value]} transition property and default timing. transition-{normal,discrete} transition-behavior. duration-{n,theme,[value],(--property)}, delay-{n,theme,[value],(--property)} transition duration or delay. ease-{linear,in,out,in-out,theme,[value],(--property)} transition timing function. motion-safe:*, motion-reduce:*, starting:* motion preference or entry-style variant. animate-none, animate-{spin,ping,pulse,bounce,fade-in,fade-out,slide-in-*,scale-in,scale-out,shimmer}, animate-<theme-name>, animate-[value] animation. only used keyframes are emitted. animation-name-{none,preset,theme,[value]}, animation-composition-{replace,add,accumulate} animation name or composition. animation-duration-{n,theme,[value],(--property)}, animation-delay-{n,theme,[value],(--property)} independent animation duration or delay. animation-ease-{linear,in,out,in-out,theme,[value],(--property)} independent animation timing function. animation-iterations-{1,2,3,infinite}, animation-direction-{normal,reverse,alternate,alternate-reverse}, animation-fill-{none,forwards,backwards,both}, animation-{running,paused} independent animation playback controls. stagger-*, stagger-index-*, stagger-count-*, stagger-reverse, {animation-,}delay-stagger explicit css stagger channels. animation-timeline-*, {scroll,view}-timeline-*, timeline-scope-*, animation-range-* progress timelines and attachment ranges. view-transition-{name,class}-*, vt-{old,new,group,image-pair}-[target]:* native snapshot capture and styling. translate-{x,y}-<spacing> composable individual translate. rotate-{n,[value]} individual rotate. scale[-x/-y]-{n,[value]} composable individual scale. skew-{x,y}-{n,[value]} composable transform skew channel. example const styles = cssx.create({ button: 'transition-transform-opacity duration-normal ease-spring-snappy hover:scale-105', dialog: 'open:starting:opacity-0 open:starting:translate-y-2 motion-reduce:duration-instant', }); <button {...cssx.props(styles.button)}>save</button>;",
  },
  'utilities/typography': {
    title: 'Typography',
    description: 'Font, text, list, writing-mode, and line-clamp utilities.',
    section: 'Utilities',
    order: 9,
    keywords: ['typography', 'font', 'text', 'line height', 'letter spacing', 'whitespace', 'list'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      "class styles font-{sans,serif,mono}, font-[value], font-(--property) built-in or custom font-family. font-{thin,extralight,light,normal,medium,semibold,bold,extrabold,black} font-weight from 100 through 900. antialiased, subpixel-antialiased font smoothing declarations. italic, not-italic font-style. text-{xs,sm,base,lg,xl,2xl}, text-[length] font size; named sizes include a default line height. leading-{none,tight,snug,normal,relaxed,loose,[value]} line-height. tracking-{tighter,tight,normal,wide,wider,widest} letter-spacing. text-{left,center,right,justify} text-align. uppercase, lowercase, capitalize, normal-case text-transform. ordinal, slashed-zero, lining-nums, oldstyle-nums, proportional-nums, tabular-nums, diagonal-fractions, stacked-fractions, normal-nums composable font-variant-numeric controls; normal-nums resets them. underline, overline, line-through, no-underline text-decoration-line. decoration-{solid,double,dotted,dashed,wavy} text-decoration-style. decoration-{auto,from-font,n,[value],(--property)} text-decoration-thickness. underline-offset-{auto,n,[value],(--property)} text-underline-offset. truncate, text-{ellipsis,clip} text overflow behavior. text-{wrap,nowrap,balance,pretty}, wrap-{anywhere,break-word,normal} text wrapping behavior. hyphens-{none,manual,auto}, whitespace-{normal,nowrap,pre,pre-line,pre-wrap,break-spaces} hyphenation or whitespace. tab-{n,[value],(--property)} tab-size. list-{inside,outside}, list-{none,disc,decimal}, list-image-{none,[value],(--property)} list styling. line-clamp-{n,none} webkit line-clamp declaration bundle. content-none, content-[value], content-(--property) content, typically with before: or after:. writing-{horizontal-tb,vertical-rl,vertical-lr}, text-orientation-{mixed,upright,sideways}, text-combine-upright-{none,all} writing mode and vertical text controls. unicode-bidi-{normal,embed,isolate,bidi-override,isolate-override,plaintext} bidirectional-text handling. font-optical-{auto,none}, font-kerning-{auto,normal,none}, font-synthesis-{none,weight,style,small-caps,position} advanced font rendering controls. example const styles = cssx.create({ title: 'font-sans text-lg font-semibold leading-tight tracking-wide tabular-nums', required: \"before:content-['required'] before:text-red-600\", }); <h2 {...cssx.props(styles.title, styles.required)}>invoice 0042</h2>;",
  },
  'utilities/variants': {
    title: 'Variants',
    description: 'Responsive, state, relationship, attribute, feature-query, and selector variants.',
    section: 'Advanced',
    order: 20,
    keywords: ['variants', 'responsive', 'hover', 'focus', 'group', 'peer', 'dark', 'supports'],
    headings: [
      {
        depth: 4,
        slug: 'example',
        text: 'Example',
      },
    ],
    searchText:
      'variants stack before a candidate, for example tablet:hover:bg-brand. cssx supports custom breakpoints from --breakpoint-*; defaults are sm, md, lg, xl, and 2xl. variant selector or condition hover: :hover within @media (hover: hover). focus:, focus-visible:, focus-within:, active:, disabled:, enabled:, visited:, checked:, indeterminate:, default:, valid:, invalid:, in-range:, out-of-range:, placeholder-shown:, autofill:, read-only:, required:, optional:, open:, target:, empty: corresponding state pseudo-class. first:, last:, only:, odd:, even:, first-of-type:, last-of-type:, only-of-type: structural pseudo-class. before:, after:, selection:, marker:, file:, first-letter:, first-line:, placeholder: pseudo-element. before and after receive default empty content. group-<state>:, peer-<state>: stateful group or sibling relationship. state-[name]:, group-state-[name]:, peer-state-[name]: custom-element :state(name) condition, directly or through a group or peer. has-<state>:, has-[selector]:, in-<state>:, not-<state>: relationship condition. *:, : direct-child or descendant scope. data-name:, data-[name=value]:, aria-name:, aria-[name=value]: attribute condition. dark:, print:, supports-[property:value]:, not-supports-[property:value]: media or support condition. <breakpoint>:, max-<breakpoint>:, min-[value]:, max-[value]: responsive condition. [&>svg]:, [&.is-active]:, [@supports(...)]:, [@media ...]: safe arbitrary selector or at-rule condition. arbitrary selector variants must contain &; only static selectors and supported at-rules are accepted. custom state names must be identifiers, for example state-[open]:block or group-state-[expanded]:text-white. example const styles = cssx.create({ trigger: \'sm:hover:bg-blue-600 group-focus:text-white data-[state=open]:block [&>svg]:size-4\', }); <button {...cssx.props(styles.trigger)} data-state="open"> <svg /> </button>;',
  },
} satisfies Record<string, DocMetadata>;
