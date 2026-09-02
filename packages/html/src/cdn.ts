import { start } from './index';

/** Starts the default-theme CDN runtime after the document is ready. */
function startWhenReady(): void {
  void start().catch((error: unknown) => {
    console.error('@cssxio/html could not compile the page classes.', error);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startWhenReady, { once: true });
} else {
  startWhenReady();
}
