# CSSX examples

Each folder is a small app that links the local CSSX workspace packages:

```sh
pnpm install
pnpm dev
```

| Example        | Integration                                 | Output                     |
| -------------- | ------------------------------------------- | -------------------------- |
| `astro`        | Vite                                        | `/assets/cssx.css`         |
| `electron`     | Vite renderer                               | `./cssx.css`               |
| `expo`         | Native Babel transform                      | React Native style objects |
| `gatsby`       | webpack                                     | `/cssx.css`                |
| `next`         | webpack                                     | `/_next/static/cssx.css`   |
| `react`        | webpack through a Create React App override | `/cssx.css`                |
| `react-native` | Native Babel transform                      | React Native style objects |
| `remix`        | Vite                                        | `/cssx.css`                |
| `solid`        | Vite                                        | `/cssx.css`                |
| `vite`         | Vite                                        | `/cssx.css`                |

The Gatsby, Create React App, and Next.js examples use webpack integration and
explain their framework-specific setup in a local README.
