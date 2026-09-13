/**
 * Creates a browser-only Webpack/Rspack HMR bridge for manually linked CSSX assets.
 *
 * @param cssFileName Generated CSSX asset file name.
 * @returns Browser HMR bridge source.
 */
export function nativeStylesheetHmr(cssFileName: string): string {
  return `if (typeof document !== "undefined" && typeof module !== "undefined" && module.hot) {
  const key = "__cssxStylesheetHmr";
  const state = globalThis[key] || (globalThis[key] = { revision: 0, staged: [], replacements: [] });
  const stylesheetLink = [...document.querySelectorAll('link[rel="stylesheet"]')].find((link) =>
    new URL(link.href, document.baseURI).pathname.endsWith(${JSON.stringify(`/${cssFileName}`)}),
  );
  const nextLink = stylesheetLink && (() => {
    const path = new URL(stylesheetLink.href, document.baseURI).pathname;
    return path.includes("/_next/");
  })();
  if (!state.installed) {
    state.installed = true;
    state.stage = () => {
      const revision = ++state.revision;
      state.staged = [];
      state.replacements = [];
      const links = [...document.querySelectorAll('link[rel="stylesheet"]')].filter((link) =>
        new URL(link.href, document.baseURI).pathname.endsWith(${JSON.stringify(`/${cssFileName}`)}),
      );
      return Promise.all(
        links.map(
          (link) =>
            new Promise((resolve) => {
              const replacement = link.cloneNode();
              const url = new URL(link.href, document.baseURI);
              url.searchParams.set("cssx", String(revision));
              replacement.href = url.href;
              const finish = (loaded) => {
                replacement.removeEventListener("load", onLoad);
                replacement.removeEventListener("error", onError);
                if (loaded) {
                  state.staged.push(link);
                  if (state.removeOnLoad) link.remove();
                }
                else replacement.remove();
                resolve();
              };
              const onLoad = () => finish(true);
              const onError = () => finish(false);
              replacement.addEventListener("load", onLoad);
              replacement.addEventListener("error", onError);
              state.replacements.push(replacement);
              link.after(replacement);
            }),
        ),
      );
    };
    module.hot.addStatusHandler((status) => {
      if (status === "prepare" || status === "dispose") {
        return state.stage();
      }
      if (status === "idle") {
        for (const link of state.staged) link.remove();
        state.staged = [];
        state.replacements = [];
      }
      if (status === "abort" || status === "fail") {
        for (const replacement of state.replacements) replacement.remove();
        state.staged = [];
        state.replacements = [];
      }
    });
    if (nextLink) module.hot.accept(() => void state.stage());
    for (const updateKey of Object.getOwnPropertyNames(globalThis).filter((name) => name.startsWith("webpackHotUpdate"))) {
      const update = globalThis[updateKey];
      if (typeof update !== "function") continue;
      globalThis[updateKey] = function (...args) {
        void state.stage();
        return update.apply(this, args);
      };
    }
    if (stylesheetLink) {
      state.removeOnLoad = Boolean(nextLink);
      const refresh = async () => {
        try {
          const url = new URL(stylesheetLink.href, document.baseURI);
          url.searchParams.set("cssx-probe", String(Date.now()));
          const css = await fetch(url.href, { cache: "no-store" }).then((response) => response.text());
          if (state.css && state.css !== css) void state.stage();
          state.css = css;
        } catch {
        }
      };
      void refresh();
      state.poll = setInterval(() => void refresh(), 500);
    }
  }
}`;
}
