# `@cssxio/react-native`

CSSX utilities for bare React Native and Expo. Styles are emitted as native
style objects; no CSS file or DOM shim is used.

```tsx
import { create, props, sx } from '@cssxio/react-native';

const styles = create({ card: 'flex-1 gap-4 rounded-lg bg-blue-600 p-4' });

<View {...props(styles.card)}>
  <Text style={sx('text-lg font-semibold text-white')}>CSSX native</Text>
</View>;
```

Add `@cssxio/react-native/babel` to the Babel plugins used by Metro. The plugin
precompiles object-literal `create` calls. The runtime fallback keeps the same
API available in tests and environments that do not run Babel.

Bare React Native:

```js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: ['@cssxio/react-native/babel'],
};
```

Expo:

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['@cssxio/react-native/babel'],
  };
};
```

Utilities that map to React Native `ViewStyle`, `TextStyle`, or `ImageStyle`
are supported. Browser-only selectors, media queries, CSS variables, grid,
tables, filters, masks, and DOM-specific values fail with an explicit build
error. Pass `{ platform: 'ios' }` or `{ platform: 'android' }` to `create` when
using the `ios:` and `android:` variants.
