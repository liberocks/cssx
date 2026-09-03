# CSSX raw HTML example

Build the workspace first, then serve this directory with any static server:

```sh
pnpm build
node ../../tests/scripts/static-server.mjs . 4319
```

Open <http://127.0.0.1:4319>. The example loads the local browser bundle; published pages should instead use the CDN URL shown in the workspace README.
