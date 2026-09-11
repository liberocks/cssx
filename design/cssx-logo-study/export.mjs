import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Curve reconstruction and CSSX adaptations. No external dependencies.
const destination = fileURLToPath(new URL('./', import.meta.url));
const variants = [
  { id: 'reference-six-loops', name: 'Reference six loops', n: 7, d: 2.4, stroke: 3.7 },
  { id: '01-loop-x', name: 'CSSX Loop X', n: 5, d: 2.35, stroke: 4.2 },
  { id: '02-soft-x', name: 'CSSX Soft X', n: 4, d: 3.4, radial: true, stroke: 5.4 },
  { id: '03-gather', name: 'CSSX Gather', n: 5, d: 1.08, stroke: 4.6 },
];
const wordmark = '<g fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"><path d="M44 8 C35 -1 8 1 5 24 C1 48 13 68 31 68 C38 68 43 66 47 62"/><path d="M108 8 C98 0 72 0 70 18 C68 34 108 31 110 48 C113 71 84 74 70 63"/><path d="M172 8 C162 0 136 0 134 18 C132 34 172 31 174 48 C177 71 148 74 134 63"/><path d="M198 6 L241 68 M241 6 L198 68"/></g>';
mkdirSync(destination, { recursive: true });
for (const v of variants) {
  const points = Array.from({ length: 401 }, (_, i) => {
    const t = i / 400 * Math.PI * 2;
    const scale = 52 / (7 + v.d);
    const radius = 7 - v.d * Math.cos(4 * t);
    return [(v.radial ? radius * Math.cos(t) : 7 * Math.cos(t) - v.d * Math.cos(v.n * t)) * scale,
      (v.radial ? radius * Math.sin(t) : 7 * Math.sin(t) - v.d * Math.sin(v.n * t)) * scale];
  });
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${p.map(x => x.toFixed(3)).join(' ')}`).join('') + 'Z';
  const mark = `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${v.stroke}" stroke-linecap="round" stroke-linejoin="round"/>`;
  writeFileSync(`${destination}${v.id}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-64 -64 128 128" role="img"><title>${v.name}</title>${mark}</svg>\n`);
  if (v.n !== 7) writeFileSync(`${destination}${v.id}-lockup.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 144" role="img"><title>${v.name} lockup</title><g transform="translate(72 72)">${mark}</g><g transform="translate(164 38)">${wordmark}</g></svg>\n`);
}
console.log('Exported four marks and three font-independent CSSX lockups.');
