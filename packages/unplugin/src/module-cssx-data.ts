import type { CssxRule } from '@cssxio/compiler';
import type { CssxSourceModule } from './stylesheet';

/** Metadata key used to retain transformed CSSX data until assets are emitted. */
export const RULES_METADATA_KEY = '@cssxio/unplugin/rules';

/** CSSX data collected for one transformed module. */
export interface ModuleCssxData extends CssxSourceModule {
  /** Compiled CSS rules from the source module. */
  readonly rules: readonly CssxRule[];
  /** Signature used to distinguish declaration-only development changes. */
  readonly cssOnlySignature: string;
}

/** Creates an empty CSSX module data record. */
export function emptyModuleCssxData(): ModuleCssxData {
  return { id: '', rules: [], candidates: {}, composites: {}, origins: {}, cssOnlySignature: '' };
}
