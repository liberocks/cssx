# CSSX logo exploration

Reference: [Mike Bespalov’s mathematical thinking indicator](https://x.com/bbssppllvv/status/2038718410318659763), viewed in the browser on 2026-09-06.

The tweet shows a six-loop curve with a traveling tapered stroke, not a collection of static logos. Its published equation is `x = 7 cos(t) − d cos(7t), y = 7 sin(t) − d sin(7t)`. The reference reconstruction uses `d = 2.4`. The tweet does not specify the exact d schedule, stroke geometry or animation timing; those are approximated in this study.

## CSSX direction

The requested personality is **soft, playful, approachable**. CSSX’s root README describes compilation of static utility strings into class names and CSS, composition into compact classes, a small helper for dynamic styles, plus HTML and React Native packages. A continuous shape gathering several curves into one mark is a visual interpretation of composition. It does not imply CSSX is an AI product or has no runtime.

- **01 · Loop X:** Four loops instead of the reference’s six. Closest to the reference, with playful curls and four diagonal lobes. More flower-like than a literal X. Best for larger brand moments and motion.
- **02 · Soft X:** Rounded concave X. Strongest candidate for the main identity because it has a simpler silhouette at small sizes. It keeps the flowing character without the tight inner loops.
- **03 · Gather:** Four soft lobes in one continuous contour. Friendly and compact, but less distinctively an X.

Each CSSX option has a monochrome mark and a custom rounded, font-independent CSSX wordmark lockup. SVG backgrounds are transparent and use `currentColor`. The preview also explores coral (`#b84736` on light surfaces and `#f59a86` on dark surfaces). These are exploratory directions, not an approved replacement of the existing site identity.

## Geometry and motion

Reference, Loop X and Gather use `x = 7 cos(t) − d cos(n t)` and `y = 7 sin(t) − d sin(n t)`, sampled over one full turn, with uniform normalization. Reference: n=7, d=2.4. Loop X: n=5, d=2.35. Gather: n=5, d=1.08. Soft X extends the harmonic idea into a four-lobed radial curve: `r = 7 − 3.4 cos(4t)`, `x = r cos(t)`, `y = r sin(t)`. Its deeper inlets create a clearer X silhouette with rounded tips.

The preview uses a 4.2-second traversal, a tapered ribbon spanning 66% of the curve, a faint whole-curve track, and a round leading tip. Pause shows the complete static mark. Motion respects reduced-motion preferences and stops when hidden. Production branding should normally use the still mark; reserve movement for deliberate activity or introductory moments.

Run `node design/cssx-logo-study/export.mjs` from the project root to regenerate the SVG studies. No dependencies or fonts are required. The reference file is a study of the cited artwork, not a proposed CSSX mark.
