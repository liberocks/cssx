export type RichNode =
  | string
  | {
      tag: string;
      class?: string;
      attrs?: Record<string, string>;
      children?: RichNode | RichNode[];
    };

export type Rich = RichNode | RichNode[];

export function renderRich(value: Rich): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(renderRich).join('');
  }
  const attributes = [
    value.class ? ` class="${value.class}"` : '',
    ...Object.entries(value.attrs ?? {})
      .map(([name, attrValue]) => ` ${name}="${attrValue}"`)
      .join(''),
  ].join('');
  const children = value.children ? renderRich(value.children) : '';
  return `<${value.tag}${attributes}>${children}</${value.tag}>`;
}

export function plainText(value: Rich): string {
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(plainText).join('');
  }
  return value.children ? plainText(value.children) : '';
}

export interface LangIndex {
  title: Rich;
  footnote: Rich;
  description: Rich;
  readDocumentation: Rich;
  worksWith: Rich;
}

export interface LangDocs {
  title: Rich;
  description: Rich;
  backHome: Rich;
}

export interface Lang {
  index: LangIndex;
  docs: LangDocs;
}
