import { start } from './start';

/**
 * Starts the default-theme CDN runtime and reports asynchronous startup failures.
 *
 * @returns Nothing after scheduling the runtime startup.
 */
export function startWhenReady(): void {
  void start().catch((error: unknown) => {
    console.error('@cssxio/html could not compile the page classes.', error);
  });
}
