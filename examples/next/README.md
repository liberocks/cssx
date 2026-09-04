# CSSX + Next.js

This small app example uses the CSSX adapter for its selected build mode. The
scripts select that mode because the other mode does not load this adapter. It
creates `static/cssx.css`, and the root layout loads it from
`/_next/static/cssx.css`. The page also includes CSSX styles from both a
Server Component and a `"use client"` component; the public stylesheet covers
both module graphs.
