import type { VariantOptions } from './apply-variants';
import type { ParsedCandidate } from './candidate';
import type { CssxTheme } from './theme';
import type { UtilityDeclaration } from './utility-types';

/** Inputs shared by the candidate's fallback, single-class, and atomized renderers. */
export interface CompileCandidateOptions {
  /** Source utility candidate. */
  readonly candidateSource: string;
  /** Generated classes assigned to this candidate. */
  readonly classNames: readonly string[];
  /** Active resolved theme. */
  readonly theme: CssxTheme;
  /** Declaration atoms to render. */
  readonly atoms: readonly (readonly UtilityDeclaration[])[];
  /** Parsed candidate and its variants. */
  readonly candidate: ParsedCandidate;
  /** Semantic write group used in CSS ordering. */
  readonly semanticGroup: string;
  /** Precomputed CSS for a data-backed recipe, when present. */
  readonly fallbackCss: string | undefined;
  /** Composite selectors associated with generated classes. */
  readonly selectorAliases: Readonly<Record<string, readonly string[]>>;
  /** Classes kept in the output, or undefined when all are included. */
  readonly includedClasses: ReadonlySet<string> | undefined;
  /** Options used while rendering candidate variants. */
  readonly variantOptions: VariantOptions;
}
