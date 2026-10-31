import { describe, expect, it, vi } from 'vitest';

import { checkNpmVersion, checkVscodeVersion, validatePlan } from './validate.mjs';

describe('release version validation', () => {
  it('validates npm, marketplace, and git tags for every package', async () => {
    const checks = {
      checkNpmVersion: vi.fn().mockResolvedValue(false),
      checkVscodeVersion: vi.fn().mockResolvedValue(false),
      checkTag: vi.fn().mockResolvedValue(false),
    };
    await validatePlan(
      {
        packages: [
          { name: '@cssxio/compiler', nextVersion: '1.2.3', tag: '@cssxio/compiler@1.2.3' },
          {
            name: 'cssx-intellisense',
            directory: 'packages/intellisense',
            registry: 'vscode',
            nextVersion: '1.2.3',
            tag: 'cssx-intellisense@1.2.3',
          },
        ],
      },
      checks,
    );
    expect(checks.checkNpmVersion).toHaveBeenCalledWith('@cssxio/compiler', '1.2.3');
    expect(checks.checkVscodeVersion).toHaveBeenCalledWith('cssxio.cssx-intellisense', '1.2.3');
    expect(checks.checkTag).toHaveBeenCalledTimes(2);
  });

  it('rejects already published versions and existing tags', async () => {
    await expect(
      validatePlan(
        { packages: [{ name: 'pkg', nextVersion: '1.0.0', tag: 'pkg@1.0.0' }] },
        {
          checkNpmVersion: async () => true,
          checkVscodeVersion: async () => false,
          checkTag: async () => false,
        },
      ),
    ).rejects.toThrow('already published');
    await expect(
      validatePlan(
        { packages: [{ name: 'pkg', nextVersion: '1.0.0', tag: 'pkg@1.0.0' }] },
        {
          checkNpmVersion: async () => false,
          checkVscodeVersion: async () => false,
          checkTag: async () => true,
        },
      ),
    ).rejects.toThrow('Release tag pkg@1.0.0 already exists');
  });

  it('checks npm metadata and rejects unexpected responses', async () => {
    const response = (status, body) => ({ status, json: async () => body });
    await expect(checkNpmVersion('pkg', '1.0.0', async () => response(404))).resolves.toBe(false);
    await expect(
      checkNpmVersion('pkg', '1.0.0', async () => response(200, { versions: { '1.0.0': {} } })),
    ).resolves.toBe(true);
    await expect(checkNpmVersion('pkg', '1.0.0', async () => response(200, {}))).rejects.toThrow('Unexpected npm');
  });

  it('checks marketplace metadata', async () => {
    await expect(checkVscodeVersion('pub.ext', '1.0.0', async () => ({ stdout: 'undefined' }))).resolves.toBe(false);
    await expect(
      checkVscodeVersion('pub.ext', '1.0.0', async () => ({ stdout: '{"versions":[{"version":"1.0.0"}]}' })),
    ).resolves.toBe(true);
    await expect(checkVscodeVersion('pub.ext', '1.0.0', async () => ({ stdout: 'invalid' }))).rejects.toThrow(
      'Unexpected Visual Studio',
    );
  });
});
