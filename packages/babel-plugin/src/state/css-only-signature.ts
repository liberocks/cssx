/** Hashes source outside CSSX utility literals for compact CSS-only edit detection. */
export function cssOnlySignature(
  source: string,
  ranges: readonly { readonly start: number; readonly end: number }[],
): string {
  let firstHash = 2166136261;
  let secondHash = 0x9e3779b9;
  let retainedLength = 0;
  const update = (start: number, end: number) => {
    for (let index = start; index < end; index++) {
      const character = source.charCodeAt(index);
      firstHash = Math.imul(firstHash ^ character, 16777619);
      secondHash = Math.imul(secondHash ^ character, 2246822519);
      retainedLength++;
    }
  };
  let position = 0;
  for (const { start, end } of [...ranges].sort((left, right) => left.start - right.start)) {
    update(position, start);
    position = end;
  }
  update(position, source.length);
  return `${retainedLength}:${(firstHash >>> 0).toString(36)}${(secondHash >>> 0).toString(36)}`;
}
