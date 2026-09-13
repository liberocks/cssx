import { invalidateViteRunner } from './invalidate-vite-runner';
import type { ViteHotUpdateModule } from './invalidate-vite-runner';
import type { ModuleCssxData } from './module-cssx-data';
import { moduleId } from './options';

/**
 * Creates the Vite hot-update hook that eagerly handles safe CSS-only changes.
 *
 * @param moduleData Transformed module metadata indexed by normalized module ID.
 * @returns A Vite hot-update handler.
 */
export function createViteHotUpdateHandler(moduleData: Map<string, ModuleCssxData>) {
  /**
   * Handles one Vite hot update, returning modules left for the standard pipeline.
   *
   * @param context Update modules and timestamp supplied by Vite.
   * @returns Remaining modules, or undefined when no CSS-only update was handled.
   */
  return async function handleViteHotUpdate(this: any, context: any): Promise<any> {
    const environment = this.environment;
    if (!environment || environment.name === 'client') {
      return undefined;
    }
    const modules = context.modules as ViteHotUpdateModule[];
    const handled = modules.filter((module) => {
      const data = moduleData.get(moduleId(module.id ?? ''));
      return Boolean(data && data.cssOnlySignature && data.atomicClasses?.length === 0);
    });
    if (handled.length === 0) {
      return undefined;
    }

    const previous = new Map(handled.map((module) => [module, moduleData.get(moduleId(module.id!))!.cssOnlySignature]));
    for (const module of handled) {
      if (module.url) {
        await environment.transformRequest(module.url);
      }
    }
    const cssOnly = handled.every((module) => {
      const data = moduleData.get(moduleId(module.id!));
      return Boolean(data && data.atomicClasses!.length === 0 && data.cssOnlySignature === previous.get(module));
    });
    if (!cssOnly) {
      return undefined;
    }

    invalidateViteRunner(environment, handled, context.timestamp);
    return modules.filter((module) => !handled.includes(module));
  };
}
