import { resolve } from 'node:path';

import type { NextDevelopmentHmrConnection } from './next-development-server';

/** Returns the deterministic browser endpoint without starting a development server. */
export function nextDevelopmentHmrConnection(root: string, styleSheetFile: string): NextDevelopmentHmrConnection {
  const projectRoot = resolve(root);
  return {
    port: localPort(projectRoot),
    token: stableToken(`${projectRoot}:${styleSheetFile}`),
  };
}

/** Deterministic loopback port that keeps separate app roots on separate endpoints. */
function localPort(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 40_000 + ((hash >>> 0) % 20_000);
}

/** Creates a stable opaque endpoint segment for the configured project. */
function stableToken(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
