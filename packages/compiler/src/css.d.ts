declare module '*.css' {
  /** CSS source imported through the module loader. */
  const css: string;
  export default css;
}

declare module '*.css?raw' {
  /** Raw CSS source imported through the module loader. */
  const css: string;
  export default css;
}
