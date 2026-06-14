# @cssxio/cssx

The CSSX runtime exports `create`, `props`, and `sx`. It also exports the `CompiledStyle`, `StyleInput`, `SxInput`, and `StyleMap` types.

```ts
import * as cssx from '@cssxio/cssx';

const styles = cssx.create({ card: 'p-5 rounded bg-white' });
const props = cssx.props(styles.card, isDisabled && 'is-disabled');
```

`create` is a build-time marker. It always throws at runtime. Configure a CSSX compiler plugin before you use it.

`props(...inputs)` accepts compiled styles, strings, `false`, `null`, `undefined`, and nested arrays. It applies compiled styles from left to right. CSSX keeps strings as written and does not read or merge their classes. It returns `{ className: string }`.

CSSX can replace fully static `props` calls with a `{ className }` object. Dynamic inputs use the small runtime merge.

See the [workspace README](../../README.md) for supported utilities, variants, setup, exclusions, and migration guidance.
