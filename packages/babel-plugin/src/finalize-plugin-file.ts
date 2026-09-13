import type { NodePath, PluginPass } from '@babel/core';
import type * as babelTypes from '@babel/types';
import type { Program } from '@babel/types';

import { compactLiveStyleRecords } from './compact-live-style-records';
import { cssOnlySignature } from './css-only-signature';
import { finalizeFoldedProps } from './finalize-folded-props';
import type { FoldedPropsCall } from './finalize-folded-props';
import { markReferencedStyleCandidates } from './mark-referenced-style-candidates';
import { materializeLiveStyleMaps } from './materialize-live-style-maps';
import type { FileState } from './plugin-types';
import { removeDeadStyleMaps } from './remove-dead-style-maps';

/** Inputs required to finalize all transformed calls in one module. */
export interface FinalizePluginFileOptions {
  /** Program AST path. */
  readonly program: NodePath<Program>;
  /** Babel plugin pass for this source file. */
  readonly babelState: PluginPass;
  /** Babel node helpers. */
  readonly types: typeof babelTypes;
  /** Runtime module specifier imported by the source. */
  readonly importSource: string;
  /** Per-file compiler state. */
  readonly state: FileState;
  /** Static props calls queued for replacement. */
  readonly foldedProps: readonly FoldedPropsCall[];
}

/**
 * Finalizes folded calls, prunes unused styles/imports, and writes compiler metadata.
 *
 * @param input Program path, Babel state, and per-file CSSX transform data.
 * @param input.program Program AST path.
 * @param input.babelState Babel plugin pass for this source file.
 * @param input.types Babel node helpers.
 * @param input.importSource Runtime module specifier imported by the source.
 * @param input.state Per-file compiler state.
 * @param input.foldedProps Static props calls queued for replacement.
 * @returns Nothing. The program and Babel metadata are finalized in place.
 */
export function finalizePluginFile({
  program,
  babelState,
  types,
  importSource,
  state,
  foldedProps,
}: FinalizePluginFileOptions): void {
  finalizeFoldedProps(program, types, foldedProps);
  program.scope.crawl();
  markReferencedStyleCandidates(program, types, state);
  materializeLiveStyleMaps(program, types, state);
  removeDeadStyleMaps(program, state);
  compactLiveStyleRecords(program, types, state);
  for (const statement of program.get('body')) {
    if (!statement.isImportDeclaration() || statement.node.source.value !== importSource) {
      continue;
    }
    for (const specifier of [...statement.get('specifiers')]) {
      const local = specifier.node.local.name;
      const binding = program.scope.getBinding(local);
      if (binding?.referencePaths.length === 0) {
        specifier.remove();
      }
    }
    if (statement.node.specifiers.length === 0) {
      statement.remove();
    }
  }
  (babelState.file.metadata as Record<string, unknown>).cssx = {
    candidates: Object.fromEntries([...state.classes].filter(([candidate]) => state.liveCandidates.has(candidate))),
    origins: Object.fromEntries(
      [...state.candidateOrigins].filter(([candidate]) => state.liveCandidates.has(candidate)),
    ),
    composites: Object.fromEntries([...state.composites].filter(([className]) => state.liveComposites.has(className))),
    atomicClasses: [...state.liveFallbackClasses].sort(),
    cssOnlySignature: cssOnlySignature(babelState.file.code, state.cssRanges),
  };
}
