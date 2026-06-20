# @cssxio/babel-plugin

This plugin compiles CSSX calls imported from `@cssxio/cssx`. That is the default `importSource`.

```js
// babel.config.js
export default {
  plugins: ['@cssxio/babel-plugin'],
};
```

It supports namespace, default, and named `create`, `props`, and `sx` imports. Named imports are called directly. Namespace and default imports must use dot notation, such as `cssx.create(...)`; computed API calls such as `cssx['create'](...)` are rejected.

`create` must be declared at module scope. It needs one plain object with non-computed keys. Values must be string literals or unchanged local constants initialized with string literals. Spreads, changed values, and other dynamic values produce an error at the source location.

The plugin replaces `create` with compiled styles. It folds a `props` call only when every input is a local compiled style, a nested array of supported inputs, `false`, or `null`. Static props folding does not accept `undefined`. Other `props` calls stay at runtime.

The plugin also compiles static strings in `sx` calls. It supports static strings, `false`, `null`, nested arrays without spreads, logical-and expressions, and conditional expressions. Unsupported nested input leaves the `sx` call at runtime.
