import { compileStyleRecords, describeUtilityRecipe, parseTheme } from '@cssxio/compiler';

export type NativePlatform = 'android' | 'ios';
export type NativeTransform = Readonly<Record<string, number | string>>;
export type NativeStyleValue = number | string | readonly NativeTransform[];
export type NativeStyle = Readonly<Record<string, NativeStyleValue>>;

export interface NativeCompilerOptions {
  readonly platform?: NativePlatform;
  readonly theme?: string;
}

export interface CompiledNativeStyle {
  readonly $$cssx: 3;
  readonly style: NativeStyle;
}

export type NativeStyleInput = CompiledNativeStyle | false | null | undefined | readonly NativeStyleInput[];

export type NativeSxInput = string | NativeStyleInput;

export type NativeStyleMap<T extends Readonly<Record<string, string>>> = {
  readonly [Key in keyof T]: CompiledNativeStyle;
};

const propertyNames: Readonly<Record<string, string>> = {
  'align-content': 'alignContent',
  'align-items': 'alignItems',
  'align-self': 'alignSelf',
  'aspect-ratio': 'aspectRatio',
  'background-color': 'backgroundColor',
  'border-bottom-color': 'borderBottomColor',
  'border-bottom-left-radius': 'borderBottomLeftRadius',
  'border-bottom-right-radius': 'borderBottomRightRadius',
  'border-bottom-width': 'borderBottomWidth',
  'border-color': 'borderColor',
  'border-left-color': 'borderLeftColor',
  'border-left-width': 'borderLeftWidth',
  'border-radius': 'borderRadius',
  'border-right-color': 'borderRightColor',
  'border-right-width': 'borderRightWidth',
  'border-style': 'borderStyle',
  'border-top-color': 'borderTopColor',
  'border-top-left-radius': 'borderTopLeftRadius',
  'border-top-right-radius': 'borderTopRightRadius',
  'border-top-width': 'borderTopWidth',
  'border-width': 'borderWidth',
  bottom: 'bottom',
  color: 'color',
  display: 'display',
  flex: 'flex',
  'flex-basis': 'flexBasis',
  'flex-direction': 'flexDirection',
  'flex-grow': 'flexGrow',
  'flex-shrink': 'flexShrink',
  'flex-wrap': 'flexWrap',
  'font-size': 'fontSize',
  'font-style': 'fontStyle',
  'font-weight': 'fontWeight',
  gap: 'gap',
  height: 'height',
  'justify-content': 'justifyContent',
  left: 'left',
  'letter-spacing': 'letterSpacing',
  'line-height': 'lineHeight',
  margin: 'margin',
  'margin-bottom': 'marginBottom',
  'margin-left': 'marginLeft',
  'margin-right': 'marginRight',
  'margin-top': 'marginTop',
  'max-height': 'maxHeight',
  'max-width': 'maxWidth',
  'min-height': 'minHeight',
  'min-width': 'minWidth',
  opacity: 'opacity',
  overflow: 'overflow',
  padding: 'padding',
  'padding-bottom': 'paddingBottom',
  'padding-left': 'paddingLeft',
  'padding-right': 'paddingRight',
  'padding-top': 'paddingTop',
  position: 'position',
  right: 'right',
  'text-align': 'textAlign',
  'text-decoration-line': 'textDecorationLine',
  'text-transform': 'textTransform',
  top: 'top',
  width: 'width',
  'z-index': 'zIndex',
};

const logicalProperties: Readonly<Record<string, readonly string[]>> = {
  'inset-inline': ['left', 'right'],
  'margin-block': ['marginTop', 'marginBottom'],
  'margin-inline': ['marginLeft', 'marginRight'],
  'padding-block': ['paddingTop', 'paddingBottom'],
  'padding-inline': ['paddingLeft', 'paddingRight'],
};

/** Compiles static utility maps to React Native-compatible style records. */
export function create<T extends Readonly<Record<string, string>>>(
  styles: T,
  options: NativeCompilerOptions = {},
): NativeStyleMap<T> {
  const records = compileStyleRecords(styles, { theme: options.theme });
  const theme = parseTheme(options.theme);
  return Object.fromEntries(
    Object.entries(records.candidates).map(([name, candidates]) => [
      name,
      { $$cssx: 3, style: compileCandidates(candidates, theme, options.platform) },
    ]),
  ) as NativeStyleMap<T>;
}

/** Merges compiled native styles from left to right. */
export function props(...inputs: readonly NativeStyleInput[]): { readonly style: NativeStyle } {
  const styles: NativeStyle[] = [];
  visitStyles(inputs, styles);
  return { style: mergeStyles(styles) };
}

/** Compiles inline utility strings and merges compiled native styles. */
export function sx(...inputs: readonly NativeSxInput[]): NativeStyle {
  const styles: NativeStyle[] = [];
  for (const input of inputs) {
    if (typeof input === 'string') {
      styles.push(create({ value: input }).value.style);
    } else {
      visitStyles([input], styles);
    }
  }
  return mergeStyles(styles);
}

function visitStyles(inputs: readonly NativeStyleInput[], output: NativeStyle[]): void {
  for (const input of inputs) {
    if (!input) {
      continue;
    }
    if (isNativeStyleArray(input)) {
      visitStyles(input, output);
      continue;
    }
    if (typeof input !== 'object' || input.$$cssx !== 3) {
      throw new Error('cssx.props() received an object that was not compiled by CSSX for React Native.');
    }
    output.push(input.style);
  }
}

function isNativeStyleArray(input: NativeStyleInput): input is readonly NativeStyleInput[] {
  return Array.isArray(input);
}

function mergeStyles(styles: readonly NativeStyle[]): NativeStyle {
  const output: Record<string, NativeStyleValue> = {};
  for (const style of styles) {
    for (const [property, value] of Object.entries(style)) {
      if (property === 'transform' && Array.isArray(output.transform) && Array.isArray(value)) {
        output.transform = [...output.transform, ...value] as readonly NativeTransform[];
      } else {
        output[property] = value;
      }
    }
  }
  return output;
}

function compileCandidates(
  candidates: readonly string[],
  theme: ReturnType<typeof parseTheme>,
  platform: NativePlatform | undefined,
): NativeStyle {
  const style: Record<string, NativeStyleValue> = {};
  for (const source of candidates) {
    const candidate = platformCandidate(source, platform);
    if (candidate === null) {
      continue;
    }
    const recipe = describeUtilityRecipe(candidate, theme);
    for (const atom of recipe.atoms) {
      for (const declaration of atom) {
        appendDeclaration(style, candidate, declaration);
      }
    }
  }
  return style;
}

function platformCandidate(source: string, platform: NativePlatform | undefined): string | null {
  const match = /^(ios|android):(.*)$/.exec(source);
  if (match) {
    return match[1] === platform ? match[2]! : null;
  }
  if (!source.startsWith('[') && source.includes(':')) {
    throw new Error(`CSSX React Native cannot represent the variant in "${source}".`);
  }
  return source;
}

function appendDeclaration(
  style: Record<string, NativeStyleValue>,
  candidate: string,
  declaration: {
    readonly property: string;
    readonly value: string;
    readonly selectorSuffix?: string;
    readonly atRule?: string;
  },
): void {
  if (declaration.selectorSuffix || declaration.atRule) {
    throw new Error(`CSSX React Native cannot represent browser-only utility "${candidate}".`);
  }
  if (appendCustomTransform(style, declaration.property, declaration.value, candidate)) {
    return;
  }
  if (appendTransform(style, declaration.property, declaration.value)) {
    return;
  }
  const logical = logicalProperties[declaration.property];
  if (logical) {
    const value = nativeValue(declaration.value, candidate);
    for (const property of logical) {
      style[property] = value;
    }
    return;
  }
  const property = propertyNames[declaration.property];
  if (!property) {
    throw new Error(
      `CSSX React Native cannot represent "${candidate}" because ${declaration.property} is browser-only.`,
    );
  }
  const value = nativeValue(declaration.value, candidate);
  if (property === 'display' && value !== 'flex' && value !== 'none') {
    throw new Error(`CSSX React Native cannot represent display value "${String(value)}" from "${candidate}".`);
  }
  if (property === 'overflow' && value !== 'visible' && value !== 'hidden') {
    throw new Error(`CSSX React Native cannot represent overflow value "${String(value)}" from "${candidate}".`);
  }
  if (property === 'flex' && typeof value === 'string') {
    style[property] = Number.parseFloat(value);
    return;
  }
  style[property] = value;
}

function appendTransform(style: Record<string, NativeStyleValue>, property: string, value: string): boolean {
  if ((property === 'translate' || property === 'rotate' || property === 'scale') && value.includes('var(')) {
    return true;
  }
  let transforms: NativeTransform[] | undefined;
  if (property === 'translate') {
    const [x = '0', y = '0'] = value.split(' ');
    transforms = [{ translateX: nativeValue(x, 'translate') }, { translateY: nativeValue(y, 'translate') }];
  } else if (property === 'rotate') {
    transforms = [{ rotate: value }];
  } else if (property === 'scale') {
    const [x = '1', y = x] = value.split(' ');
    transforms = [{ scaleX: Number(x) }, { scaleY: Number(y) }];
  }
  if (!transforms) {
    return false;
  }
  style.transform = [...((style.transform as readonly NativeTransform[] | undefined) ?? []), ...transforms];
  return true;
}

function appendCustomTransform(
  style: Record<string, NativeStyleValue>,
  property: string,
  value: string,
  candidate: string,
): boolean {
  const transformProperty: Readonly<Record<string, string>> = {
    '--cssx-rotate': 'rotate',
    '--cssx-scale-x': 'scaleX',
    '--cssx-scale-y': 'scaleY',
    '--cssx-translate-x': 'translateX',
    '--cssx-translate-y': 'translateY',
  };
  const nativeProperty = transformProperty[property];
  if (!nativeProperty) {
    return false;
  }
  const native = nativeValue(value, candidate);
  style.transform = [
    ...((style.transform as readonly NativeTransform[] | undefined) ?? []),
    { [nativeProperty]: native },
  ];
  return true;
}

function nativeValue(value: string, candidate: string): number | string {
  const important = value.endsWith(' !important') ? value.slice(0, -11) : value;
  const calculation = /^calc\((-?[\d.]+)rem \* (-?[\d.]+)\)$/.exec(important);
  if (calculation) {
    return Number(calculation[1]) * 16 * Number(calculation[2]);
  }
  const rem = /^(-?[\d.]+)rem$/.exec(important);
  if (rem) {
    return Number(rem[1]) * 16;
  }
  const pixels = /^(-?[\d.]+)px$/.exec(important);
  if (pixels) {
    return Number(pixels[1]);
  }
  if (/^-?[\d.]+$/.test(important)) {
    return Number(important);
  }
  if (/^(?:#|rgb|rgba|hsl|hsla|hwb|transparent|black|white)/.test(important) || important.endsWith('%')) {
    return important;
  }
  const oklch = oklchToSrgbHex(important);
  if (oklch) {
    return oklch;
  }
  if (important.startsWith('var(') || important.startsWith('color-mix(') || important.startsWith('oklch(')) {
    throw new Error(`CSSX React Native requires "${candidate}" to resolve to a native color or value at build time.`);
  }
  return important;
}

/** Converts an opaque CSS OKLCH color to the sRGB hex notation React Native accepts. */
function oklchToSrgbHex(value: string): string | null {
  const match = /^oklch\(([\d.]+)%(?:\s|_)+([\d.]+)(?:\s|_)+([\d.]+)\)$/.exec(value);
  if (!match) {
    return null;
  }
  const lightness = Number(match[1]) / 100;
  const chroma = Number(match[2]);
  const hue = (Number(match[3]) * Math.PI) / 180;
  const a = chroma * Math.cos(hue);
  const b = chroma * Math.sin(hue);
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const hex = channels
    .map((channel) => {
      const bounded = Math.max(0, Math.min(1, channel));
      const srgb = bounded <= 0.0031308 ? 12.92 * bounded : 1.055 * bounded ** (1 / 2.4) - 0.055;
      return Math.round(srgb * 255)
        .toString(16)
        .padStart(2, '0');
    })
    .join('');
  return `#${hex}`;
}
