/** Named component counts for the supported benchmark scales. */
export const WORKLOAD_VARIANTS = Object.freeze({
  small: 100,
  medium: 500,
  large: 1_000,
});

/** Supported benchmark scale names in execution order. */
export const WORKLOAD_VARIANT_NAMES = Object.freeze(Object.keys(WORKLOAD_VARIANTS));

/** Reads an optional scale name from command-line arguments. */
export function readVariantArgument(argumentsList) {
  return argumentsList.find((argument) => argument !== '--');
}

const BACKGROUNDS = [
  ['blue', '500', '#3b82f6'],
  ['blue', '600', '#2563eb'],
  ['indigo', '600', '#4f46e5'],
  ['violet', '600', '#7c3aed'],
  ['cyan', '600', '#0891b2'],
  ['emerald', '600', '#059669'],
];

const GAPS = [
  ['2', '0.5rem'],
  ['3', '0.75rem'],
  ['4', '1rem'],
  ['5', '1.25rem'],
];

const PADDING_X = [
  ['3', '0.75rem'],
  ['4', '1rem'],
  ['5', '1.25rem'],
  ['6', '1.5rem'],
];

const PADDING_Y = [
  ['1', '0.25rem'],
  ['2', '0.5rem'],
  ['3', '0.75rem'],
];

const RADIUS = [
  ['md', '0.375rem'],
  ['lg', '0.5rem'],
  ['xl', '0.75rem'],
];

/** Builds one deterministic corpus for the selected benchmark scale. */
export function createWorkload(variant = 'large') {
  const componentCount = WORKLOAD_VARIANTS[variant];
  if (!componentCount) {
    throw new Error(`Unknown benchmark variant "${variant}". Choose: ${WORKLOAD_VARIANT_NAMES.join(', ')}.`);
  }
  const components = Array.from({ length: componentCount }, (_, index) => createComponent(index));

  return {
    variant,
    componentCount,
    utilityOccurrences: components.reduce((total, component) => total + component.candidates.length, 0),
    components,
    cssxStyleMap: Object.fromEntries(components.map((component) => [component.name, component.candidates.join(' ')])),
    tailwindCandidates: components.flatMap((component) => component.candidates),
    tailwindSource: [
      'export const props = {',
      ...components.map(
        (component) => `  ${component.name}: { className: ${JSON.stringify(component.candidates.join(' '))} },`,
      ),
      '};',
    ].join('\n'),
    cssxSource: [
      "import * as cssx from '@cssxio/cssx';",
      'const styles = cssx.create({',
      ...components.map((component) => `  ${component.name}: ${JSON.stringify(component.candidates.join(' '))},`),
      '});',
      'export const props = {',
      ...components.map((component) => `  ${component.name}: cssx.props(styles.${component.name}),`),
      '};',
    ].join('\n'),
    stylexSource: [
      "import * as stylex from '@stylexjs/stylex';",
      'const styles = stylex.create({',
      ...components.map((component) => `  ${component.name}: ${JSON.stringify(component.stylex)},`),
