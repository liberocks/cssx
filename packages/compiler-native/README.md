# `@cssxio/compiler-native`

This optional package contains the CSSX Rust and Oxc analyzer for macOS arm64.
It is installed as an optional dependency of `@cssxio/unplugin` on supported
machines. Other platforms use CSSX's TypeScript and Babel fallback.

The release workflow builds the addon with Rust 1.99.1 and includes the native
library in this package. To build it locally, run:

```sh
cargo +1.99.1 build --manifest-path packages/compiler/native/Cargo.toml --release -p cssx-compiler-node
```

The output is `packages/compiler/native/target/release/libcssx_compiler_node.dylib`.
