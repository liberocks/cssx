# @cssxio/html

`@cssxio/html` compiles CSSX utility classes found in an ordinary HTML document at runtime. The CDN build uses the default CSSX theme and scans the initial page once.

```html
<script defer src="https://cdn.jsdelivr.net/npm/@cssxio/html@0.2.0/dist/cssx.global.js"></script>
<main class="min-h-screen bg-slate-950 p-6 text-white">Hello</main>
```

For custom tokens, bundle and host your own script:

```ts
import { start } from '@cssxio/html';

void start({ theme: '@theme { --color-brand: #3245ff; }' });
```

The runtime keeps class attributes unchanged and ignores custom classes it does not recognize. It does not process content added after the page first loads.
