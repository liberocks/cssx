# CSSX visual tests

This directory verifies CSSX in the seven runnable framework examples:

| Folder   | Fixture           | Development command           | Production command              |
| -------- | ----------------- | ----------------------------- | ------------------------------- |
| `astro`  | `examples/astro`  | `astro dev`                   | `astro build` + `astro preview` |
| `gatsby` | `examples/gatsby` | `gatsby develop`              | `gatsby build` + `gatsby serve` |
| `next`   | `examples/next`   | `next dev`                    | `next build` + `next start`     |
| `react`  | `examples/react`  | CRA development server        | static production build         |
| `vite`   | `examples/vite`   | `vite`                        | `vite build` + `vite preview`   |
| `remix`  | `examples/remix`  | Remix Vite development server | Remix build + server            |
| `solid`  | `examples/solid`  | `vite`                        | `vite build` + `vite preview`   |

`pnpm test:visual` runs every folder in both modes, one server at a time. Run
`pnpm test:visual:update` intentionally when an approved visual change needs
new Playwright baselines.
