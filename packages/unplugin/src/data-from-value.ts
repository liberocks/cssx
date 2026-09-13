import { emptyModuleCssxData, type ModuleCssxData } from './module-cssx-data';

/**
 * Validates a value read from build metadata as CSSX module data.
 *
 * @param value Metadata value to validate.
 * @returns Valid module data or an empty data record.
 */
export function dataFromValue(value: unknown): ModuleCssxData {
  if (!value || typeof value !== 'object') {
    return emptyModuleCssxData();
  }
  const { id, rules, candidates, composites, atomicClasses, origins, cssOnlySignature } =
    value as Partial<ModuleCssxData>;
  return {
    id: typeof id === 'string' ? id : '',
    rules: Array.isArray(rules) ? rules : [],
    candidates: candidates && typeof candidates === 'object' ? candidates : {},
    composites: composites && typeof composites === 'object' ? composites : {},
    ...(Array.isArray(atomicClasses) ? { atomicClasses } : {}),
    origins: origins && typeof origins === 'object' ? origins : {},
    cssOnlySignature: typeof cssOnlySignature === 'string' ? cssOnlySignature : '',
  };
}
