# CSSX benchmarks

These are deterministic local regression benchmarks, not a universal framework
ranking. They use a canonical component corpus with explicit physical padding,
colors, font size, and line height. Every runner validates that final CSS
contains every component width and the shared canonical declarations.

| Variant | Components | Declarations |
| ------- | ---------: | -----------: |
| Small   |        100 |        1,620 |
| Medium  |        500 |        8,100 |
| Large   |      1,000 |       16,200 |

Run every canonical and Vite application suite:

```sh
pnpm --dir benchmarks benchmark
```

Run one scale:

```sh
pnpm --dir benchmarks benchmark:medium
```

## Suites

### Final bundled output

This compares CSSX, Tailwind, styled-components, and StyleX as final build artifacts. Each
implementation receives the same component corpus and keeps style definitions
internal. JavaScript and CSS are minified before each implementation's final
artifacts are measured separately.
CSSX uses its default serial names and automatic reusability planning. StyleX
rules are converted to final CSS with `processStylexRules`; intermediate
metadata is never counted. Tailwind receives the same component utility
occurrences as its generated consumer JavaScript and imports its utilities
layer without preflight or base CSS. The canonical corpus includes a bracketed
box-shadow value with whitespace; CSSX receives literal spaces and Tailwind
receives the equivalent underscore aliases.
styled-components uses its standard runtime-tagged component definitions, so
its rules are included in the JavaScript artifact rather than a separately
extracted CSS artifact.

Reported output consists of separate JavaScript and CSS artifacts. Gzip size is
the sum of independently compressed artifacts, matching normal delivery rather
than compressing JavaScript and CSS together.

The benchmark uses gzip level 6 explicitly so size measurements are
reproducible.

### Pre-extracted utility candidate compilation

The individual CSSX utility runner remains available for compiler profiling.
It compares CSSX and Tailwind only after candidate extraction. Both receive
equivalent deduplicated candidate lists and report final CSS only. The whitespace
value uses literal spaces in CSSX and underscore aliases in Tailwind. Tailwind
imports its utilities layer without preflight or base CSS, so resets are not
charged to only one implementation.

`benchmark:cssx-utilities` and `benchmark:tailwind-utilities` measure this same
CSS-only stage. Both use the small, medium, or large canonical workload and
report 15 timed samples after a validated warmup. For example:

```sh
pnpm --dir benchmarks benchmark:cssx-utilities small --json
pnpm --dir benchmarks benchmark:tailwind-utilities small --json
```

The Rust-backed development source scan is measured separately by
`pnpm benchmark:dev-hmr`. It uses 400 source modules and a large generated
`.open-next` bundle, reports the initial scan and 30 warm edits, and excludes
save-to-visible browser timing. Set `CSSX_DISABLE_NATIVE_COMPILER=1` to measure
the Babel fallback in a separate process. The browser HMR gate remains
`pnpm test:hmr`.

On the reference ARM64 development machine with Node 24.22.1, the pre-extracted
CSS-only utility medians were:

| Variant |     CSSX | Tailwind | CSSX CSS bytes | Tailwind CSS bytes |
| ------- | -------: | -------: | -------------: | -----------------: |
| Small   | 0.487 ms | 1.040 ms |          2,709 |              5,860 |
| Medium  | 1.334 ms | 1.803 ms |          9,909 |             21,060 |
| Large   | 2.768 ms | 3.366 ms |         19,069 |             40,380 |

These pre-extracted candidate measurements use CSSX's current TypeScript
compiler; they do not measure the Rust analyzer. The separate full small
final-bundle measurement was 9.819 ms for CSSX and 3.180 ms for Tailwind.
CSSX's utility-only stage is faster in this corpus, while its full final-build
pipeline is still slower than Tailwind and does not yet meet the production
build target. These local measurements do not replace the browser
save-to-visible gate.

## Measurement protocol

- The suite rebuilds CSSX compiler and Babel artifacts once, then every runner
  verifies that compiler artifacts match their source hashes before it starts.
- Every runner performs one untimed validation warmup and 15 timed samples.
- Six isolated child-process trials are collected per framework and scale.
- Runner order rotates across trials.
- Every timed output must equal the warmup output and every process trial must
  produce identical artifact byte counts.
- The table reports the median of all 90 timed samples per runner.

Individual runners default to `large`:

```sh
pnpm --dir benchmarks benchmark:cssx
pnpm --dir benchmarks benchmark:stylex
pnpm --dir benchmarks benchmark:styled-components
pnpm --dir benchmarks benchmark:cssx-utilities
pnpm --dir benchmarks benchmark:tailwind
```

### Vite application output

`benchmark:vite` builds four matching React/Vite applications in `cssx`,
`tailwind`, `styled-components`, and `stylex`. They share the exact component tree and content while
each project uses its native styling integration.

```sh
pnpm --dir benchmarks benchmark:vite
```

The report measures all JavaScript and CSS reachable from the initial
`index.html` entry. It reports delivered, JavaScript, and CSS gzip sizes.
Source maps, manifests, HTML, and any non-initial assets are excluded. The
Tailwind uses its official full import, including preflight. The fixture
intentionally stays within the CSS feature subset expressible by all three
implementations.
