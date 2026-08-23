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

`coverage/visual-page.spec.ts` is the dedicated CSSX scope page. It builds a
stable visual board from the CSSX compiler and covers each documented utility
family, syntax form, variants, theme resources, style composition, `create`,
`props`, and `sx`. The package compiler and runtime suites remain the exhaustive
contract for individual utilities and merge semantics.

Install the browser once after installing dependencies:

```sh
pnpm --dir tests exec playwright install chromium
```
