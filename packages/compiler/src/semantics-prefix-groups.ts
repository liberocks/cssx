import { PREFIX_LAYOUT_GROUPS } from './prefix-layout-groups';
import { PREFIX_MOTION_GROUPS } from './prefix-motion-groups';
import { PREFIX_PAINT_GROUPS } from './prefix-paint-groups';
import { PREFIX_SPACING_TEXT_GROUPS } from './prefix-spacing-text-groups';

/** Ordered utility-prefix groups; specific prefixes precede their parents. */
export const PREFIX_GROUPS: readonly [prefix: string, group: string][] = [
  ...PREFIX_LAYOUT_GROUPS,
  ...PREFIX_SPACING_TEXT_GROUPS,
  ...PREFIX_PAINT_GROUPS,
  ...PREFIX_MOTION_GROUPS,
];
