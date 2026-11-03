import { basename } from 'node:path';

import type { NextDevelopmentHmrConnection } from './next-development-server';

/** Creates a browser bridge that replaces CSSX rules without waiting for JavaScript HMR. */
export function nextDevelopmentStylesheetHmr(
  connection: NextDevelopmentHmrConnection,
  stylesheetName?: string,
  initialRevision?: number,
  initialStylesheetHash?: string,
): string {
  const baseUrl = JSON.stringify(`http://127.0.0.1:${connection.port}/${connection.token}`);
  const stylesheetSuffix = JSON.stringify(stylesheetName ? `/${basename(stylesheetName)}` : '');
  const eventStreamUrl =
    initialRevision === undefined
      ? `${baseUrl} + "/events"`
      : JSON.stringify(
          `http://127.0.0.1:${connection.port}/${connection.token}/events?revision=${initialRevision}${initialStylesheetHash === undefined ? '' : `&stylesheetHash=${encodeURIComponent(initialStylesheetHash)}`}`,
        );
  const revision = Number.isSafeInteger(initialRevision) && initialRevision! >= 0 ? initialRevision : -1;
  const stylesheetHash = JSON.stringify(initialStylesheetHash ?? null);
  return `if (typeof document !== "undefined") {
  const key = "__cssxDevelopmentStylesheetHmr";
  const state = globalThis[key] || (globalThis[key] = { installed: false, revision: ${revision}, stylesheetHash: ${stylesheetHash}, style: undefined });
  if (!state.installed) {
    state.installed = true;
    state.refresh = async (revision, pushedCss, pushedHash) => {
      if (state.refreshing) {
        if (
          !state.pendingRevision ||
          state.pendingRevision.revision < revision ||
          (pushedHash !== undefined && pushedHash !== state.pendingRevision.stylesheetHash)
        ) {
          state.pendingRevision = { revision, css: pushedCss, stylesheetHash: pushedHash };
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
        if (revision < state.revision && (pushedHash === undefined || pushedHash === state.stylesheetHash)) return;
        if (pushedHash && getComputedStyle(document.documentElement).getPropertyValue("--cssx-dev-stylesheet-hash").trim() === pushedHash) {
          state.revision = revision;
          state.stylesheetHash = pushedHash;
          return;
        }
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
        const shouldScanSheets = generatedSheets === undefined || sheetsChanged;
        const sheetsToClean = shouldScanSheets ? [...document.styleSheets] : generatedSheets;
        if (generatedSheets === undefined || sheetsChanged) {
          state.generatedSheets = [];
          state.stylesheetCount = stylesheetCount;
        }
        if (state.style?.isConnected) {
          state.style.textContent = css;
        } else {
          const style = document.createElement("style");
          style.dataset.cssxDevelopmentStylesheet = "";
          style.textContent = css;
          const cachedLink = state.stylesheetLink;
          const stylesheetLink = ${stylesheetSuffix} ? (cachedLink?.isConnected ? cachedLink : [...document.querySelectorAll('link[rel="stylesheet"]')].find((link) =>
            new URL(link.href, document.baseURI).pathname.endsWith(${stylesheetSuffix}),
          )) : undefined;
          if (stylesheetLink) {
            state.stylesheetLink = stylesheetLink;
            stylesheetLink.after(style);
          } else {
            document.head.append(style);
          }
          state.style = style;
        }
        for (const sheet of sheetsToClean) {
          if (sheet.ownerNode?.dataset?.cssxDevelopmentStylesheet !== undefined) continue;
          try {
            if (removeGeneratedRules(sheet) && shouldScanSheets) state.generatedSheets.push(sheet);
          } catch {}
        }
        state.revision = revision;
        state.stylesheetHash = pushedHash || null;
      } catch {}
      finally {
        state.refreshing = false;
        const pending = state.pendingRevision;
        state.pendingRevision = undefined;
        if (
          pending !== undefined &&
          (pending.revision > state.revision ||
            (pending.stylesheetHash !== undefined && pending.stylesheetHash !== state.stylesheetHash))
        ) {
          void state.refresh(pending.revision, pending.css, pending.stylesheetHash);
        }
      }
    };
    state.events = new EventSource(${eventStreamUrl});
    state.events.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (Number.isSafeInteger(message.revision)) {
          state.receivedRevision = message.revision;
          const currentHash = getComputedStyle(document.documentElement).getPropertyValue("--cssx-dev-stylesheet-hash").trim();
          if (message.stylesheetHash && currentHash === message.stylesheetHash) {
            state.revision = message.revision;
            state.stylesheetHash = message.stylesheetHash;
          } else if (
            message.revision >= state.revision ||
            (message.stylesheetHash !== undefined && message.stylesheetHash !== state.stylesheetHash)
          ) {
            void state.refresh(message.revision, message.css, message.stylesheetHash);
          }
        }
      } catch {}
    };
  }
}`;
}
