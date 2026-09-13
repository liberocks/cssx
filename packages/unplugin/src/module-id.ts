/**
 * Removes query values from a module ID.
 *
 * @param id A module ID.
 * @returns The module ID without its query value.
 */
export function moduleId(id: string): string {
  return id.split('?', 1).join('');
}
