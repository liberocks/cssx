---
title: 'Quick start'
description: 'Install CSSX, enable the build plugin, and write your first static utility styles.'
section: 'Start here'
order: 0
keywords:
  - install
  - setup
  - vite
  - plugin
  - sx
  - cssx.create
---

CSSX turns static utility strings into generated CSS during your build. Start with the runtime package and the plugin for your bundler.

## Install

```sh
pnpm add @cssxio/cssx @cssxio/unplugin
```

## Enable the Vite plugin

```ts
import cssx from '@cssxio/unplugin/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [cssx({ cssFileName: 'assets/cssx.css' })],
});
```

The plugin finds static CSSX strings, compiles the utilities, and emits the stylesheet as part of the build.

## Add utilities to a component

```tsx
import { sx } from '@cssxio/cssx';

export function Button() {
  return (
    <button className={sx('rounded-lg bg-blue-600 px-4 py-2 text-white', 'hover:bg-blue-700')}>Save changes</button>
  );
}
```

Use `sx` to join static utility strings and runtime conditions. CSSX compiles the static strings; runtime values are joined as class names. See [Utility syntax](/docs/utilities/syntax-and-values) and [Variants](/docs/utilities/variants) for the full reference.
