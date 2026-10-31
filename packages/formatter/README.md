# `@cssxio/formatter`

CSSX-aware utility ordering and whitespace formatting for JavaScript and
TypeScript source files. The optional Rust analyzer finds formatter-safe source
ranges. The existing CSSX compiler metadata and TypeScript sorter remain the
single source of truth for utility order and CSSX conflict behavior.

## Install

```sh
pnpm add -D @cssxio/formatter
```

Run the CSSX formatter before Oxfmt or Prettier:

```sh
pnpm exec cssx-format --write .
pnpm exec oxfmt --write .
```

Use `--check` in CI. The command accepts file paths, directories, and glob
patterns, and defaults to the current directory. It writes by default. Add
`.cssxformatignore` at the project root to list ignored glob patterns, one per
line; blank lines and `#` comments are ignored. Pass `--ignore-path <file>` to
use a different ignore file. Framework output and caches, including
`node_modules`, `dist`, `build`, `.next`, `.open-next`, `.nuxt`, `.svelte-kit`,
`.astro`, `.vite`, `.turbo`, `.vercel`, and `.cache`, are ignored by default.

## What it formats

The formatter follows named imports and aliases for `sx`, `create`, and
`props` from `@cssxio/cssx`, plus namespace imports such as
`import * as cssx from '@cssxio/cssx'`. It respects local shadowing. It formats
static string literals in `sx` and `props` arguments, nested arrays and
condition branches, and inline `create` map values. It leaves shared constants
and interpolated template literals unchanged.

Utilities are ordered by semantic category:

1. Layout and positioning
2. Flex, grid, and alignment
3. Sizing
4. Spacing
5. Typography
6. Borders and radii
7. Backgrounds
8. Effects
9. Transforms and motion
10. Interaction and accessibility

Base utilities come before responsive and state variants. The compiler's
variant ordering is used for each candidate. Utilities that can write
overlapping properties retain their relative source order, so `p-4 px-2` and
`p-4 p-2` keep their CSSX semantics. Duplicates are preserved. Unknown or
ambiguous utilities divide the list into independent sorting groups.

Whitespace between utility tokens is normalized to one space. The CSSX-aware
tokenizer keeps whitespace inside arbitrary values and quoted strings, as in
`content-['hello  world']` and `bg-[url('a  b.png')]`.

```tsx
<section className={sx('w-full max-w-sm rounded-xl   bg-white p-7')} />
```

becomes:

```tsx
<section className={sx('w-full max-w-sm p-7 rounded-xl bg-white')} />
```

When `@cssxio/compiler-native` is installed with a supported platform binary,
the formatter uses it to parse source and find CSSX call literals without
building a JavaScript AST object for every file. If the native package or a
matching binary is unavailable, the formatter falls back to Oxc's JavaScript
parser. Both paths call the same TypeScript utility sorter and metadata.

The formatter uses the same class registry as the compiler. See the main
[CSSX Utility Support reference](https://github.com/liberocks/cssx#utility-support)
for the complete list of supported utility families and exact classes.

## Performance

Run a cold full-project check with:

```sh
pnpm exec cssx-format --check .
```

The formatter processes files sequentially to keep memory and CPU usage
bounded. With the native analyzer installed, the goal is to keep a cold run on
the reference Overmost workspace (about 674 source files) under one second.
Project size, filesystem speed, and CPU affect the result. Repeated runs can be
measured with `/usr/bin/time -p pnpm exec cssx-format --check .`; this measures
CSSX formatting alone, before Oxfmt or Prettier. On the local macOS arm64
machine, new-process checks measured 0.96 s and 1.21 s with the native analyzer,
versus 9.38 s with the JavaScript parser fallback. Filesystem cache state and
machine load affect these results.

## API

```ts
import { formatSource, formatUtilityList } from '@cssxio/formatter';

formatUtilityList('w-full max-w-sm rounded-xl   bg-white p-7');

formatSource(source, {
  filename: 'src/page.tsx',
  importSource: '@cssxio/cssx',
});
```

`formatSource` returns `{ code, changed, diagnostics }`. Parse errors are
reported without modifying the input source.
