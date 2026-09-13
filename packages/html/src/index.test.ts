import { afterEach, describe, expect, it, vi } from 'vitest';
import { RUNTIME_STYLESHEET_ATTRIBUTE, start } from '../src/index';

class TestElement {
  readonly attributes = new Map<string, string>();
  textContent = '';

  constructor(className?: string) {
    if (className !== undefined) {
      this.attributes.set('class', className);
    }
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
}

class TestHead {
  readonly styles: TestElement[] = [];

  querySelector(selector: string): TestElement | null {
    return selector === `style[${RUNTIME_STYLESHEET_ATTRIBUTE}]`
      ? (this.styles.find((style) => style.attributes.has(RUNTIME_STYLESHEET_ATTRIBUTE)) ?? null)
      : null;
  }

  append(style: TestElement): void {
    this.styles.push(style);
  }
}

class TestDocument {
  readonly head = new TestHead();
  readonly listeners = new Map<string, () => void>();

  constructor(
    readonly elements: readonly TestElement[],
    readonly readyState: DocumentReadyState = 'complete',
  ) {}

  querySelectorAll(selector: string): readonly TestElement[] {
    return selector === '[class]' ? this.elements : [];
  }

  createElement(name: string): TestElement {
    if (name !== 'style') {
      throw new Error(`Unexpected element ${name}.`);
    }
    return new TestElement();
  }

  addEventListener(name: string, listener: () => void): void {
    this.listeners.set(name, listener);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('@cssxio/html', () => {
  it('compiles supported source classes and preserves ordinary classes', async () => {
    const source = new TestElement('p-5 hover:bg-red-500 [mask-type:luminance] htmx-indicator app-card');
    const document = new TestDocument([source, new TestElement(), new TestElement('')]);

    const stylesheet = await start({ document: document as unknown as Document });

    expect(source.getAttribute('class')).toBe('p-5 hover:bg-red-500 [mask-type:luminance] htmx-indicator app-card');
    expect(document.head.styles).toEqual([stylesheet]);
    expect(stylesheet.getAttribute(RUNTIME_STYLESHEET_ATTRIBUTE)).toBe('');
    expect(stylesheet.textContent).toContain('.p-5{padding:calc(0.25rem * 5);}');
    expect(stylesheet.textContent).toContain('.hover\\:bg-red-500:hover');
    expect(stylesheet.textContent).toContain('.\\[mask-type\\:luminance\\]{mask-type:luminance;}');
    expect(stylesheet.textContent).not.toContain('htmx-indicator');
    expect(stylesheet.textContent).not.toContain('app-card');
  });

  it('reuses its stylesheet and accepts a self-hosted theme', async () => {
    const document = new TestDocument([new TestElement('bg-brand')]);
    const theme = '@theme { --color-brand: #123456; }';
    const first = await start({
      document: document as unknown as Document,
      theme,
      darkMode: 'selector',
    });
    const second = await start({ document: document as unknown as Document, theme });

    expect(second).toBe(first);
    expect(document.head.styles).toHaveLength(1);
    expect(first.textContent).toContain('.bg-brand{background-color:#123456;}');
  });

  it('ignores malformed class candidate lists', async () => {
    const document = new TestDocument([new TestElement('p-[unterminated')]);

    const stylesheet = await start({ document: document as unknown as Document });

    expect(stylesheet.textContent).toBe('');
  });

  it('requires a browser document when none is supplied', async () => {
    await expect(start()).rejects.toThrow('@cssxio/html requires a browser document.');
  });

  it('starts the CDN bundle immediately after document parsing', async () => {
    const document = new TestDocument([new TestElement('p-4')]);
    vi.stubGlobal('document', document);

    await import('../src/cdn');
    await vi.waitFor(() => expect(document.head.styles).toHaveLength(1));

    expect(document.head.styles[0]?.textContent).toContain('.p-4{padding:calc(0.25rem * 4);}');
  });

  it('starts the CDN bundle when DOMContentLoaded fires', async () => {
    const document = new TestDocument([new TestElement('text-white')], 'loading');
    vi.stubGlobal('document', document);

    await import('../src/cdn');
    document.listeners.get('DOMContentLoaded')?.();
    await vi.waitFor(() => expect(document.head.styles).toHaveLength(1));

    expect(document.head.styles[0]?.textContent).toContain('.text-white{color:#fff;}');
  });

  it('reports CDN startup failures without throwing synchronously', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('document', { readyState: 'complete' });

    await import('../src/cdn');
    await vi.waitFor(() => expect(error).toHaveBeenCalledOnce());

    expect(error).toHaveBeenCalledWith('@cssxio/html could not compile the page classes.', expect.any(TypeError));
  });
});
