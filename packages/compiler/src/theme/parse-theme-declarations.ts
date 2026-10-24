import { splitThemeDeclarations } from './split-theme-declarations';

/**
 * Parses declarations and namespace resets from one theme block.
 *
 * @param block Theme declaration source.
 * @param tokens Mutable token store to update.
 * @returns Nothing after valid declarations have been applied.
 */
export function parseThemeDeclarations(block: string, tokens: Record<string, string>): void {
  for (const declaration of splitThemeDeclarations(block)) {
    const separator = declaration.indexOf(':');
    if (separator === -1) {
      throw new Error(`Invalid CSSX @theme declaration "${declaration}".`);
    }
    const name = declaration.slice(0, separator).trim();
    const value = declaration.slice(separator + 1).trim();
    if (name === '--*' || /^--[a-z0-9-]+-\*$/i.test(name)) {
      if (value !== 'initial') {
        throw new Error(`CSSX theme namespace reset "${name}" must use initial.`);
      }
      const prefix = name === '--*' ? '--' : name.slice(0, -1);
      for (const token of Object.keys(tokens)) {
        if (token.startsWith(prefix)) {
          delete tokens[token];
        }
      }
      continue;
    }
    if (!/^--[a-z0-9-]+$/i.test(name) || !value || /[{};]/.test(value)) {
      throw new Error(`Invalid CSSX @theme declaration "${declaration}".`);
    }
    tokens[name] = value;
  }
}
