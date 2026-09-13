import { unpluginFactory } from './index';

/**
 * Creates a test instance of the selected bundler adapter.
 *
 * @param framework Bundler adapter to instantiate.
 * @param options Options passed to the CSSX plugin factory.
 * @returns The selected adapter plugin instance.
 */
export function pluginFor(framework: 'vite' | 'webpack' | 'rspack' | 'esbuild', options: Record<string, unknown> = {}) {
  return unpluginFactory(options, { framework, versions: {} } as never) as any;
}
