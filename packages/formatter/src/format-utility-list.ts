import { compareCandidateVariants, describeUtilityFormatting, splitCandidateList } from '@cssxio/compiler';
import type { UtilityFormattingMetadata } from '@cssxio/compiler';

interface Candidate {
  readonly source: string;
  readonly metadata: UtilityFormattingMetadata;
}

/** Formats CSSX utility candidates into canonical semantic groups. */
export function formatUtilityList(value: string): string {
  const tokens = splitCandidateList(value);
  const output: string[] = [];
  let segment: Candidate[] = [];
  const flush = () => {
    output.push(...sortSegment(segment));
    segment = [];
  };

  for (const source of tokens) {
    const metadata = describeUtilityFormatting(source);
    if (!metadata) {
      flush();
      output.push(source);
      continue;
    }
    segment.push({ source, metadata });
  }
  flush();
  return output.join(' ');
}

function sortSegment(candidates: readonly Candidate[]): string[] {
  if (candidates.length < 2) {
    return candidates.map(({ source }) => source);
  }

  const edges = candidates.map(() => new Set<number>());
  const incoming = candidates.map(() => 0);
  for (let left = 0; left < candidates.length; left += 1) {
    for (let right = left + 1; right < candidates.length; right += 1) {
      if (shareWriteDomain(candidates[left]!, candidates[right]!)) {
        edges[left]!.add(right);
        incoming[right] = incoming[right]! + 1;
      }
    }
  }

  const ready = candidates.map((_, index) => index).filter((index) => incoming[index] === 0);
  const sorted: string[] = [];
  while (ready.length > 0) {
    ready.sort((left, right) => compareCandidates(candidates[left]!, candidates[right]!));
    const index = ready.shift()!;
    sorted.push(candidates[index]!.source);
    for (const next of edges[index]!) {
      incoming[next] = incoming[next]! - 1;
      if (incoming[next] === 0) {
        ready.push(next);
      }
    }
  }
  return sorted;
}

function shareWriteDomain(left: Candidate, right: Candidate): boolean {
  if (left.metadata.variantScope !== right.metadata.variantScope) {
    return false;
  }
  const rightDomains = new Set(right.metadata.writeDomains);
  return left.metadata.writeDomains.some((domain) => rightDomains.has(domain));
}

function compareCandidates(left: Candidate, right: Candidate): number {
  const variantComparison = compareCandidateVariants(left.metadata.variants, right.metadata.variants);
  if (variantComparison !== 0) {
    return variantComparison;
  }
  const category = left.metadata.categoryRank - right.metadata.categoryRank;
  if (category !== 0) {
    return category;
  }
  const family = left.metadata.familyRank - right.metadata.familyRank;
  if (family !== 0) {
    return family;
  }
  return left.metadata.group.localeCompare(right.metadata.group);
}
