import type { ParsedCandidate } from '../candidates/candidate';
import type { CssxTheme } from '../theme/theme';
import type { UtilityDeclaration } from '../utilities/registry/utility-types';
import type { VariantOptions } from '../variants/apply-variants';

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
