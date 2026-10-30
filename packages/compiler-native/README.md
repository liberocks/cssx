# `@cssxio/compiler-native`

This optional package contains the CSSX Rust and Oxc analyzer. It includes
Linux x64, macOS arm64, and Windows x64 Node-API binaries. On other operating
systems or architectures the package loader returns no native analyzer and
`@cssxio/unplugin` uses CSSX's TypeScript and Babel fallback.

The release workflow builds the addon with Rust 1.99.1 and includes the native
library in this package. To build it locally, run:

```sh
cargo +1.99.1 build --manifest-path packages/compiler/native/Cargo.toml --release -p cssx-compiler-node
```

The output is `packages/compiler/native/target/release/libcssx_compiler_node.dylib`
on macOS, `libcssx_compiler_node.so` on Linux, or `cssx_compiler_node.dll` on
Windows. The release workflow stages these as platform-specific `.node` files.
