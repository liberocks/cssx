# CSSX benchmarks

These are deterministic local regression benchmarks, not a universal framework
ranking. They use a canonical component corpus with explicit physical padding,
colors, font size, and line height. Every runner validates that final CSS
contains every component width and the shared canonical declarations.

| Variant | Components | Declarations |
| ------- | ---------: | -----------: |
| Small   |        100 |        1,520 |
| Medium  |        500 |        7,600 |
| Large   |      1,000 |       15,200 |

Run the complete suite:

```sh
pnpm --dir benchmarks benchmark
```

Run one scale:

```sh
pnpm --dir benchmarks benchmark:medium
```

## Suites

### Final bundled output

This compares CSSX, Tailwind, and StyleX as final build artifacts. Each
implementation exports the same component-to-`className` data and keeps style
definitions internal. JavaScript and CSS are minified before each
implementation's final CSS is measured separately.
CSSX uses its default serial names and automatic reusability planning. StyleX
rules are converted to final CSS with `processStylexRules`; intermediate
metadata is never counted. Tailwind receives the same component utility
occurrences as its generated consumer JavaScript and imports its utilities
layer without preflight or base CSS.

Reported output consists of separate JavaScript and CSS artifacts. Gzip size is
the sum of independently compressed artifacts, matching normal delivery rather
than compressing JavaScript and CSS together.

The benchmark uses gzip level 6 explicitly so size measurements are
reproducible.

### Pre-extracted utility candidate compilation

The individual CSSX utility runner remains available for compiler profiling.
It compares CSSX and Tailwind only after candidate extraction. Both receive
the same deduplicated candidate list and report final CSS only. Tailwind imports
its utilities layer without preflight or base CSS, so resets are not charged to
only one implementation.

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
pnpm --dir benchmarks benchmark:cssx-utilities
pnpm --dir benchmarks benchmark:tailwind
```
