# @cssxio/unplugin

CSSX has build tool adapters at these entrypoints:

```ts
import cssxVite from '@cssxio/unplugin/vite';
import cssxRollup from '@cssxio/unplugin/rollup';
import cssxWebpack from '@cssxio/unplugin/webpack';
import cssxRspack from '@cssxio/unplugin/rspack';
import cssxEsbuild from '@cssxio/unplugin/esbuild';
```

Add the selected adapter to your build tool `plugins` setting:

```ts
// vite.config.ts
import cssx from '@cssxio/unplugin/vite';
export default { plugins: [cssx()] };
```

```js
// rollup.config.js
import cssx from '@cssxio/unplugin/rollup';
export default { plugins: [cssx({ cssFileName: 'assets/cssx.css' })] };
```

```js
// webpack.config.js
import cssx from '@cssxio/unplugin/webpack';
export default { plugins: [cssx()] };
```

```js
// rspack.config.js
import cssx from '@cssxio/unplugin/rspack';
export default { plugins: [cssx()] };
```

```js
// build.mjs
import { build } from 'esbuild';
import cssx from '@cssxio/unplugin/esbuild';

await build({ entryPoints: ['src/main.ts'], bundle: true, plugins: [cssx()] });
```

## Programmatic API

The main entrypoint exports the low-level `unpluginFactory`, the universal `unplugin` adapter instance, and named callable factories for Vite, Rollup, webpack, Rspack, and esbuild. Most applications should import one platform entrypoint shown above.

```ts
import { transformCssxModule, compileCssxStylesheet } from '@cssxio/unplugin';

const transformed = await transformCssxModule(source, 'src/button.tsx');
const stylesheet = await compileCssxStylesheet([
  {
    id: 'src/button.tsx',
