# @cssxio/html

`@cssxio/html` compiles CSSX utility classes found in an ordinary HTML document at runtime. The CDN build uses the default CSSX theme and scans the initial page once. Utilities with literal spaces inside brackets are compiled and replaced with safe generated class names in the matching `class` attributes.

```html
<script defer src="https://cdn.jsdelivr.net/npm/@cssxio/html@0.2.0/dist/cssx.global.js"></script>
<main class="min-h-screen bg-slate-950 p-6 text-white">Hello</main>
```

For custom tokens, bundle and host your own script:

```ts
import { start } from '@cssxio/html';

void start({ theme: '@theme { --color-brand: #3245ff; }' });
```

The runtime leaves ordinary utility and application class names unchanged and ignores custom classes it does not recognize. For example, `class="grid-cols-[13rem minmax(0,1fr)] app-card"` is rewritten to a safe internal class plus `app-card`. It does not process content added after the page first loads.
