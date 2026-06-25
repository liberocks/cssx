import { transformCssxModule, unpluginFactory } from '../src/index';

export const source = `import * as cssx from '@cssxio/cssx'; export const styles = cssx.create({ root: 'p-5 bg-red-500' });`;

export function pluginFor(framework: 'vite' | 'webpack' | 'rspack' | 'esbuild') {
  return unpluginFactory({}, { framework, versions: {} } as never) as any;
}

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

export function decodeFirstMapping(mappings: string): number[] {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const values: number[] = [];
  let value = 0;
  let shift = 0;
  for (const character of mappings.split(',', 1)[0] ?? '') {
    const digit = alphabet.indexOf(character);
    value |= (digit & 31) << shift;
    if (digit & 32) {
      shift += 5;
      continue;
    }
    values.push(value & 1 ? -(value >> 1) : value >> 1);
    value = 0;
    shift = 0;
  }
  return values;
}
