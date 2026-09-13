import { ACCENT_COLOR_TOKENS } from './theme-colors-accent';
import { BLUE_COLOR_TOKENS } from './theme-colors-blue';
import { GREEN_COLOR_TOKENS } from './theme-colors-green';
import { MUTED_COLOR_TOKENS } from './theme-colors-muted';
import { NEUTRAL_COLOR_TOKENS } from './theme-colors-neutral';
import { VIOLET_COLOR_TOKENS } from './theme-colors-violet';
import { WARM_COLOR_TOKENS } from './theme-colors-warm';

/** Complete documented color palette used by the default theme. */
export const DEFAULT_DOCUMENTED_COLOR_TOKENS: Readonly<Record<string, string>> = {
  ...WARM_COLOR_TOKENS,
  ...GREEN_COLOR_TOKENS,
  ...BLUE_COLOR_TOKENS,
  ...VIOLET_COLOR_TOKENS,
  ...NEUTRAL_COLOR_TOKENS,
  ...MUTED_COLOR_TOKENS,
  ...ACCENT_COLOR_TOKENS,
};
