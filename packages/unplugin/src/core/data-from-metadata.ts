import { emptyModuleCssxData, RULES_METADATA_KEY, type ModuleCssxData } from '../transforms/module-cssx-data';
import { dataFromValue } from './data-from-value';

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
