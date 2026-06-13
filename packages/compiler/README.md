# @cssxio/compiler

`@cssxio/compiler` builds static utility strings without a source transform or build tool adapter.

```ts
import { compileStyleMap, serializeCss } from '@cssxio/compiler';

const result = await compileStyleMap({
  card: 'p-5 bg-white hover:bg-gray-50',
});

const className = result.classNames.card;
const css = serializeCss(result.rules, { layer: 'cssx' });
```

## Class names

The style-map compiler APIs accept `className`. By default CSSX uses compact,
collision-free serial names: `s0x`, `s1x`, and so on.

Static style maps also default to `reusabilityBudget: 'auto'`. CSSX shares
positive-value groups of utilities between repeated styles and leaves each
style with a residual class when needed. Set `0` to keep one complete class per
style or `100` to emit only winning atomic classes.

```ts
const result = await compileStyleMap(styles, { reusabilityBudget: 0 });
```

```ts
const result = await compileStyleMap(
  { card: 'p-5 bg-white' },
  {
    className: {
      variant: 'serial',
      prefix: 'app-',
      suffix: '-v1',
    },
  },
);
// Atomic and composite names: app-0-v1, app-1-v1, …, app-z-v1, app-A-v1, …, app-10-v1
```

`serial` is a collision-free, case-sensitive base-62 counter for the complete
compilation: `0` through `9`, then `a` through `z`, then `A` through `Z`, then
`10`. Its default prefix and suffix are `s` and `x` (`s0x`, `s1x`, …). It is
the smallest output for a bounded build, while the `prefix` gives it a project
namespace. Choose the stable content-hash `random` variant when that better
fits your build; set
`length` to fix the hash fragment length when you need a smaller output:

```ts
{ className: { variant: 'random', prefix: 'app_', suffix: '_v1', length: 5 } }
// app_0p4jd_v1
```

CSSX resolves collisions deterministically for random names. A fixed random
length must have enough base-36 combinations for every generated atomic and
composite class; otherwise compilation fails instead of reusing a class name.
`length` applies only to `random`, and `prefix` must be a non-empty safe CSS
identifier prefix. Prefixes and suffixes work with both variants.

When you compile independent maps that share one stylesheet, create one
allocator and pass it as `classNameAllocator` to every call, including
`composeCompiledStyles`. This keeps serial values unique across those calls.

```ts
const classNameAllocator = createClassNameAllocator();
const first = compileStyleRecords({ button: 'p-4' }, { classNameAllocator });
const second = compileStyleRecords({ card: 'bg-white' }, { classNameAllocator });
```

## API

### High-level compilation
