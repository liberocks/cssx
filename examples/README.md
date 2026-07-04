# CSSX examples

Each folder is a small app that links the local CSSX workspace packages:

```sh
pnpm install
pnpm dev
```

| Example  | Adapter                                     | CSS path                 |
| -------- | ------------------------------------------- | ------------------------ |
| `astro`  | Vite                                        | `/assets/cssx.css`       |
| `gatsby` | webpack                                     | `/cssx.css`              |
| `next`   | webpack                                     | `/_next/static/cssx.css` |
| `react`  | webpack through a Create React App override | `/cssx.css`              |
| `remix`  | Vite                                        | `/cssx.css`              |
| `solid`  | Vite                                        | `/cssx.css`              |
| `vite`   | Vite                                        | `/cssx.css`              |

The Gatsby, Create React App, and Next.js examples use webpack integration and
explain their framework-specific setup in a local README.
