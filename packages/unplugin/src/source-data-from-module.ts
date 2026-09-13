import type { ModuleWithCssxRules, StoredCssxSourceModule } from './native-types';
import type { CssxSourceModule } from './stylesheet-types';

/**
 * Reads CSSX source data stored on one native bundler module.
 *
 * @param module Native bundler module to read.
 * @param metadataKey Key used to store CSSX metadata.
 * @returns Valid source data, or undefined when the module has no valid metadata.
 */
export function sourceDataFromModule(module: ModuleWithCssxRules, metadataKey: string): CssxSourceModule | undefined {
  const value = module.buildInfo?.[metadataKey];
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const { id, candidates, composites, atomicClasses, origins } = value as StoredCssxSourceModule;
  return {
    id: typeof id === 'string' ? id : '',
    candidates: candidates && typeof candidates === 'object' ? candidates : {},
    composites: composites && typeof composites === 'object' ? composites : {},
    ...(Array.isArray(atomicClasses) ? { atomicClasses } : {}),
    origins: origins && typeof origins === 'object' ? origins : {},
  };
}
