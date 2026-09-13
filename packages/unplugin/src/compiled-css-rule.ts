import type { CssxRule } from '@cssxio/compiler';

import { stableId } from './options';

/** Converts compiled CSS into the rule shape used for stylesheet collection. */
export function compiledCssRule(css: string): CssxRule {
  return { className: `cssx-${stableId(css)}`, css };
}
