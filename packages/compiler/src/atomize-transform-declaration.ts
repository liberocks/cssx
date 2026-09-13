import type { UtilityDeclaration } from './utility-types';

/** Transform declaration atoms and source declarations consumed to create them. */
export interface TransformDeclarationAtoms {
  /** Independent atoms that share one or more transform sink declarations. */
  readonly atoms: readonly (readonly UtilityDeclaration[])[];
  /** Number of declarations after the current one consumed by the result. */
  readonly consumedDeclarations: number;
}

/** Internal transform custom properties whose values share a CSS sink. */
const TRANSFORM_CHANNELS = [
  '--cssx-translate-x',
  '--cssx-translate-y',
  '--cssx-scale-x',
  '--cssx-scale-y',
  '--cssx-skew-x',
  '--cssx-skew-y',
];

/**
 * Creates atomic groups for transform channels and their CSS transform sinks.
 *
 * @param declarations Ordered declarations from one utility.
 * @param index Index of the transform channel under consideration.
 * @returns Transform atoms and consumed declaration count, or undefined when unmatched.
 */
export function atomizeTransformDeclaration(
  declarations: readonly UtilityDeclaration[],
  index: number,
): TransformDeclarationAtoms | undefined {
  const declaration = declarations[index]!;
  if (
    declaration.property === '--cssx-scale-x' &&
    declarations[index + 1]?.property === '--cssx-scale-y' &&
    declarations[index + 2]?.property === 'scale'
  ) {
    const y = declarations[index + 1]!;
    const sink = declarations[index + 2]!;
    return {
      atoms: [
        [declaration, sink],
        [y, sink],
      ],
      consumedDeclarations: 2,
    };
  }

  if (!TRANSFORM_CHANNELS.includes(declaration.property)) {
    return undefined;
  }
  const sink = declarations[index + 1];
  if (sink?.property !== 'translate' && sink?.property !== 'scale' && sink?.property !== 'transform') {
    return undefined;
  }
  return { atoms: [[declaration, sink]], consumedDeclarations: 1 };
}
