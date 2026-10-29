import { basename } from 'node:path';

import type { NextDevelopmentHmrConnection } from './next-development-server';

/** Creates a browser bridge that replaces CSSX rules without waiting for JavaScript HMR. */
export function nextDevelopmentStylesheetHmr(
  connection: NextDevelopmentHmrConnection,
  stylesheetName?: string,
): string {
  const baseUrl = JSON.stringify(`http://127.0.0.1:${connection.port}/${connection.token}`);
  const stylesheetSuffix = JSON.stringify(stylesheetName ? `/${basename(stylesheetName)}` : '');
  return `if (typeof document !== "undefined") {
  const key = "__cssxDevelopmentStylesheetHmr";
  const state = globalThis[key] || (globalThis[key] = { installed: false, revision: -1, style: undefined });
  if (!state.installed) {
    state.installed = true;
    state.refresh = async (revision, pushedCss) => {
      if (state.refreshing) {
        if (!state.pendingRevision || state.pendingRevision.revision < revision) {
          state.pendingRevision = { revision, css: pushedCss };
        }
        return;
      }
      state.refreshing = true;
      try {
        let css = pushedCss;
        if (css === undefined) {
          const response = await fetch(${baseUrl} + "/stylesheet?revision=" + revision, { cache: "no-store" });
          if (!response.ok) return;
          css = await response.text();
        }
        if (revision < state.revision) return;
        const removeGeneratedRules = (owner) => {
          let removed = false;
          const rules = owner.cssRules;
          for (let index = rules.length - 1; index >= 0; index--) {
            const rule = rules[index];
            if (rule.selectorText && /\\.(?:d[a-z0-9]+|s[a-z0-9]+x)\\b/.test(rule.selectorText)) {
              owner.deleteRule(index);
              removed = true;
            } else if (rule.cssRules) {
              removed = removeGeneratedRules(rule) || removed;
            }
          }
          return removed;
        };
        const generatedSheets = state.generatedSheets;
        const stylesheetCount = document.styleSheets.length - (state.style?.isConnected ? 1 : 0);
        const sheetsChanged = generatedSheets !== undefined && (
          stylesheetCount !== state.stylesheetCount ||
          generatedSheets.some((sheet) => sheet.ownerNode && !sheet.ownerNode.isConnected)
        );
        if (generatedSheets === undefined || sheetsChanged) {
          state.generatedSheets = [];
          for (const sheet of document.styleSheets) {
            if (sheet.ownerNode?.dataset?.cssxDevelopmentStylesheet !== undefined) continue;
            try { if (removeGeneratedRules(sheet)) state.generatedSheets.push(sheet); } catch {}
          }
          state.stylesheetCount = stylesheetCount;
        } else {
          for (const sheet of generatedSheets) {
            try { removeGeneratedRules(sheet); } catch {}
          }
        }
        const stylesheetLink = ${stylesheetSuffix} ? [...document.querySelectorAll('link[rel="stylesheet"]')].find((link) =>
          new URL(link.href, document.baseURI).pathname.endsWith(${stylesheetSuffix}),
        ) : undefined;
        const style = document.createElement("style");
        style.dataset.cssxDevelopmentStylesheet = "";
        style.textContent = css;
        if (state.style?.parentNode) state.style.before(style);
        else if (stylesheetLink) stylesheetLink.after(style);
        else document.head.append(style);
        state.style?.remove();
        state.style = style;
        state.revision = revision;
      } catch {}
      finally {
        state.refreshing = false;
        const pending = state.pendingRevision;
        state.pendingRevision = undefined;
        if (pending !== undefined && pending.revision > state.revision) void state.refresh(pending.revision, pending.css);
      }
    };
    state.events = new EventSource(${baseUrl} + "/events");
    state.events.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (Number.isSafeInteger(message.revision) && message.revision > state.revision) {
          void state.refresh(message.revision, message.css);
        }
      } catch {}
    };
  }
}`;
}
