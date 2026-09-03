# Electron example

Run `pnpm install`, then `pnpm dev` for Vite HMR inside Electron. Run
`pnpm build && pnpm start` to load the production renderer from `dist/`.

The renderer has no Node.js integration. Context isolation and the renderer
sandbox remain enabled; the preload exposes only an immutable platform string.
