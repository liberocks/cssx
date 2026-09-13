import { dataFromValue } from './data-from-value';
import { emptyModuleCssxData, RULES_METADATA_KEY, type ModuleCssxData } from './module-cssx-data';

/**
 * Reads CSSX module data from build metadata.
 *
 * @param metadata Build metadata to inspect.
 * @returns Valid module data or an empty data record.
 */
export function dataFromMetadata(metadata: unknown): ModuleCssxData {
  if (!metadata || typeof metadata !== 'object') {
    return emptyModuleCssxData();
  }
  return dataFromValue((metadata as Record<string, unknown>)[RULES_METADATA_KEY]);
}
