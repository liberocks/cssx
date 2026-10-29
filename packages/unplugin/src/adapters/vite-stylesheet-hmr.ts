/** Creates the browser bridge that atomically replaces the Vite development stylesheet. */
export function viteDevelopmentStylesheetHmr(cssFileName: string, baseUrl?: string): string {
  const suffix = JSON.stringify(`/${cssFileName.replaceAll('\\', '/')}`);
  const eventsFile = JSON.stringify(`${cssFileName.replaceAll('\\', '/')}.events`);
  const baseUrlExpression = baseUrl === undefined ? 'import.meta.env.BASE_URL' : JSON.stringify(baseUrl);
  return `if (typeof document !== "undefined" && typeof EventSource !== "undefined") {
  const key = "__cssxViteStylesheetHmr";
  const state = globalThis[key] || (globalThis[key] = { installed: false, revision: 0, style: undefined, source: undefined });
  if (!state.installed) {
    state.installed = true;
    const source = new EventSource(${baseUrlExpression} + ${eventsFile});
    state.source = source;
    source.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (!payload || typeof payload.css !== "string" || payload.revision <= state.revision) return;
      const stylesheetLink = [...document.querySelectorAll('link[rel="stylesheet"]')].find((link) =>
        new URL(link.href, document.baseURI).pathname.endsWith(${suffix}),
      );
      const style = document.createElement("style");
      style.dataset.cssxDevelopmentStylesheet = "";
      style.textContent = payload.css;
      if (state.style?.isConnected) state.style.after(style);
      else if (stylesheetLink?.isConnected) stylesheetLink.after(style);
      else document.head.append(style);
      state.style?.remove();
      state.style = style;
      state.revision = payload.revision;
    };
  }
}`;
}
