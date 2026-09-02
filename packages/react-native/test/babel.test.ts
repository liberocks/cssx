import { transformAsync } from '@babel/core';
import { describe, expect, it } from 'vitest';
import plugin from '../src/babel';

async function transform(source: string, options: Record<string, unknown> = {}): Promise<string> {
  const result = await transformAsync(source, {
    babelrc: false,
    configFile: false,
    filename: 'App.tsx',
    parserOpts: { plugins: ['typescript', 'jsx'] },
    plugins: [[plugin, options]],
  });
  return result?.code ?? '';
}

describe('React Native Babel transform', () => {
  it('precompiles named create imports and respects platform options', async () => {
    const output = await transform(
      `import { create } from '@cssxio/react-native'; const styles = create({ root: 'p-4 ios:bg-blue-600' });`,
      { platform: 'ios' },
    );
    expect(output).toContain('$$cssx: 3');
    expect(output).toContain('padding: 16');
    expect(output).toContain('backgroundColor: "#2563eb"');
  });

  it('ignores unrelated calls and supports custom import sources', async () => {
    expect(await transform(`const styles = create({ root: 'p-4' });`)).toContain('create({');
    expect(await transform(`import * as cssx from '@cssxio/react-native'; cssx.create({ root: 'p-4' });`)).toContain(
      'cssx.create',
    );
    expect(
      await transform(`import { create } from 'native-cssx'; create({ root: 'p-2' });`, {
        importSource: 'native-cssx',
      }),
    ).toContain('padding: 8');
  });

  it('rejects non-object calls and dynamic values', async () => {
    await expect(transform(`import { create } from '@cssxio/react-native'; create(value);`)).rejects.toThrow(
      'one object literal',
    );
    await expect(transform(`import { create } from '@cssxio/react-native'; create({ root: value });`)).rejects.toThrow(
      'static string literals',
    );
    await expect(
      transform(`import { create } from '@cssxio/react-native'; create({ [value]: 'p-2' });`),
    ).rejects.toThrow('style keys must be static');
  });

  it('supports string and numeric keys and rejects unsupported key nodes', async () => {
    const output = await transform(
      `import { create } from '@cssxio/react-native'; create({ 'root-item': 'p-2', 2: 'm-1' });`,
    );
    expect(output).toContain('root-item');
    expect(output).toContain('"2"');
    await expect(
      transform("import { create } from '@cssxio/react-native'; create({ [`root`]: 'p-2' });"),
    ).rejects.toThrow('style keys must be static');
    await expect(transform("import { create } from '@cssxio/react-native'; create({ 1n: 'p-2' });")).rejects.toThrow(
      'style keys must be static',
    );
  });
});
