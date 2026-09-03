import { expect, test } from '@playwright/test';
import { compileUtilities } from '../../packages/compiler/src/index';
import { capabilityCandidates, capabilityGroups } from './capability-manifest';

function className(candidate: string): string {
  let hash = 5381;
  for (const character of candidate) hash = (hash * 33) ^ character.charCodeAt(0);
  return `v${(hash >>> 0).toString(36)}`;
}

test.describe('CSSX capability scope page', () => {
  test('compiles every documented family and renders interactive representative states', async ({ page }) => {
    const compilation = await compileUtilities(capabilityCandidates, className);
    expect(Object.keys(compilation.classes)).toHaveLength(capabilityCandidates.length);

    const classFor = (candidate: string) => compilation.classes[candidate] ?? '';
    const cards = Object.entries(capabilityGroups)
      .map(([name, candidates]) => {
        const classes = candidates.map(classFor).join(' ');
        return `<section class="card ${classes}" data-scope="${name}"><h2>${name}</h2><p>${candidates.join(' · ')}</p><button class="button ${classFor('hover:bg-blue-600')} ${classFor('focus-visible:ring-2')}">Inspect</button><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M12 4v16" /></svg></section>`;
      })
      .join('');

    await page.setContent(`<!doctype html><html><head><style>
      ${compilation.css}
      *{box-sizing:border-box}body{margin:0;background:#0b1020;color:#eff6ff;font-family:ui-sans-serif,system-ui,sans-serif}.board{padding:32px;max-width:1440px;margin:auto}.title{margin:0 0 8px;font-size:32px}.lede{margin:0 0 28px;color:#cbd5e1}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}.card{min-height:148px;padding:18px;border:1px solid #334155;border-radius:14px;background:#172033}.card h2{margin:0 0 10px;font-size:16px;text-transform:capitalize}.card p{margin:0;color:#cbd5e1;font-size:12px;line-height:1.5;overflow-wrap:anywhere}.button{margin-top:16px;border:0;border-radius:8px;padding:8px 12px;background:#2563eb;color:white;font:inherit}.card svg{display:block;margin-top:12px;width:24px;height:24px;fill:none;stroke:currentColor}@media(max-width:800px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:540px){.grid{grid-template-columns:1fr}}
    </style></head><body><main class="board"><h1 class="title">CSSX visual capability scope</h1><p class="lede">One visual representative for every documented CSSX family; compiler and runtime unit suites cover each individual utility.</p><div class="grid">${cards}</div></main></body></html>`);

    await expect(page.locator('[data-scope]')).toHaveCount(Object.keys(capabilityGroups).length);
    await expect(page).toHaveScreenshot('cssx-capability-scope.png', { fullPage: true });
    await page.getByRole('button', { name: 'Inspect' }).first().hover();
    await expect(page).toHaveScreenshot('cssx-capability-scope-hover.png', { fullPage: true });
  });
});
