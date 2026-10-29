import { moduleId } from '../core/options';
import type { ModuleCssxData } from '../transforms/module-cssx-data';

/** Module identity fields used by Vite's hot-update context. */
interface ViteHotUpdateModule {
  readonly id?: string;
  readonly url?: string;
}

/**
 * Creates the Vite hot-update hook that eagerly handles safe CSS-only changes.
 *
 * @param moduleData Transformed module metadata indexed by normalized module ID.
 * @returns A Vite hot-update handler.
 */
export function createViteHotUpdateHandler(
  moduleData: Map<string, ModuleCssxData>,
  isPretransformedCssOnly: (id: string, source: string) => boolean = () => false,
  updateCssOnlySource?: (id: string, source?: string) => Promise<boolean>,
) {
  /**
   * Handles one Vite hot update, returning modules left for the standard pipeline.
   *
   * @param context Update modules and timestamp supplied by Vite.
   * @returns Remaining modules, or undefined when no CSS-only update was handled.
   */
  return async function handleViteHotUpdate(this: any, context: any): Promise<any> {
    const environment = this.environment;
    if (!environment) {
      return undefined;
    }
    const modules = context.modules as ViteHotUpdateModule[];
    const handled = modules.filter((module) => {
      const data = moduleData.get(moduleId(module.id ?? ''));
      return Boolean(data && data.cssOnlySignature);
    });
    if (handled.length === 0) {
      return undefined;
    }

    const source = typeof context.read === 'function' ? await context.read() : undefined;
    const pretransformed = new Set(
      source === undefined ? [] : handled.filter((module) => isPretransformedCssOnly(moduleId(module.id!), source)),
    );
    const previous = new Map(handled.map((module) => [module, moduleData.get(moduleId(module.id!))!.cssOnlySignature]));
    if (updateCssOnlySource) {
      for (const module of handled) {
        const handledByRuntime =
          source === undefined ? await updateCssOnlySource(module.id!) : await updateCssOnlySource(module.id!, source);
        if (handledByRuntime) {
          continue;
        } else if (module.url) {
          await environment.transformRequest(module.url);
        } else {
          continue;
        }
      }
    } else {
      for (const module of handled) {
        if (!pretransformed.has(module) && module.url) {
          await environment.transformRequest(module.url);
        }
      }
    }
    const cssOnly = handled.every((module) => {
      const data = moduleData.get(moduleId(module.id!));
      return Boolean(data && data.cssOnlySignature === previous.get(module));
    });
    if (!cssOnly) {
      return undefined;
    }

    // A matching CSS-only signature guarantees the transformed module's JavaScript is unchanged.
    // Keeping the SSR module cached avoids framework refreshes that can discard the injected sheet.
    return modules.filter((module) => !handled.includes(module));
  };
}
