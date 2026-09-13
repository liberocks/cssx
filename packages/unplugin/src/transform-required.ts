import { transformCssxModule } from './index';

/**
 * Transforms a CSSX module and throws when the source is not transformable.
 *
 * @param code Source module text.
 * @param id Module identifier used by the adapter.
 * @param options CSSX transform options.
 * @param sourceMap Optional source map from an earlier transform.
 * @returns The transformed module.
 */
export async function transformRequired(
  code: string,
  id: string,
  options = {},
  sourceMap?: Parameters<typeof transformCssxModule>[3],
) {
  const result = await transformCssxModule(code, id, options, sourceMap);
  if (!result) {
    throw new Error(`CSSX did not transform ${id}.`);
  }
  return result;
}
