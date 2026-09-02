import { describe, expect, it } from 'vitest';
import { create, props, sx } from '../src/index';

describe('React Native runtime', () => {
  it('compiles native layout, spacing, color, typography, and border utilities', () => {
    const styles = create({
      card: 'flex-1 flex-row items-center justify-between gap-2 rounded-lg bg-blue-600 p-4 opacity-50',
      title: 'text-lg font-semibold text-white text-center uppercase underline tracking-wide',
      image: 'relative top-2 size-12 overflow-hidden',
    });

    expect(styles.card).toEqual({
      $$cssx: 3,
      style: expect.objectContaining({
        alignItems: 'center',
        backgroundColor: '#2563eb',
        borderRadius: 8,
        flex: 1,
        flexDirection: 'row',
        gap: 8,
        justifyContent: 'space-between',
        opacity: 0.5,
        padding: 16,
      }),
    });
    expect(styles.title.style).toEqual(
      expect.objectContaining({
        color: '#fff',
        fontSize: 18,
        textAlign: 'center',
        textDecorationLine: 'underline',
        textTransform: 'uppercase',
      }),
    );
    expect(styles.image.style).toEqual(
      expect.objectContaining({ height: 48, overflow: 'hidden', position: 'relative', top: 8, width: 48 }),
    );
  });

  it('expands logical spacing and converts pixels, rems, percentages, and important values', () => {
    const styles = create({ value: 'px-2 py-[3px] w-1/2 min-h-[2rem] opacity-75!' });
    expect(styles.value.style).toEqual(
      expect.objectContaining({
        minHeight: 32,
        opacity: 0.75,
        paddingBottom: 3,
        paddingLeft: 8,
        paddingRight: 8,
        paddingTop: 3,
        width: '50%',
      }),
    );
  });

  it('selects platform variants and rejects browser variants', () => {
    expect(create({ value: 'ios:p-4 android:p-2' }, { platform: 'ios' }).value.style).toEqual({ padding: 16 });
    expect(create({ value: 'ios:p-4 android:p-2' }, { platform: 'android' }).value.style).toEqual({ padding: 8 });
    expect(create({ value: 'ios:p-4' }).value.style).toEqual({});
    expect(() => create({ value: 'hover:bg-red-500' })).toThrow('cannot represent the variant');
  });

  it('merges nested conditional styles and composes transforms', () => {
    const styles = create({ base: 'p-2 translate-x-2', override: 'p-4 rotate-6 scale-105' });
    expect(props(styles.base, [false, null, undefined, styles.override]).style).toEqual(
      expect.objectContaining({
        padding: 16,
        transform: [{ translateX: 8 }, { rotate: '6deg' }, { scaleX: 1.05 }, { scaleY: 1.05 }],
      }),
    );
    expect(sx('p-2', false, styles.override)).toEqual(expect.objectContaining({ padding: 16 }));
    expect(props().style).toEqual({});
    expect(() => props({ style: {} } as never)).toThrow('not compiled by CSSX');
  });

  it('rejects browser-only declarations and unresolved values with explicit candidates', () => {
    expect(() => create({ value: 'grid' })).toThrow('display value');
    expect(() => create({ value: 'overflow-scroll' })).toThrow('overflow value');
    expect(() => create({ value: 'cursor-pointer' })).toThrow('cursor is browser-only');
    expect(() => create({ value: 'before:block' })).toThrow('cannot represent the variant');
    expect(() => create({ value: 'bg-slate-500' })).toThrow('resolve to a native color');
  });

  it('supports custom native-safe theme values', () => {
    const theme = '@theme { --color-brand: rgb(1 2 3); --spacing: 0.5rem; }';
    expect(create({ value: 'bg-brand p-2' }, { theme }).value.style).toEqual({
      backgroundColor: 'rgb(1 2 3)',
      padding: 16,
    });
  });

  it('maps logical arbitrary properties and direct native transforms', () => {
    expect(create({ value: '[flex:1_1_0%]' }).value.style).toEqual({ flex: 1 });
    expect(
      create({
        value:
          '[padding-inline:1rem] [margin-block:2px] [inset-inline:10%] [flex:2] [translate:1rem_2rem] [rotate:10deg] [scale:2]',
      }).value.style,
    ).toEqual({
      left: '10%',
      flex: 2,
      marginBottom: 2,
      marginTop: 2,
      paddingLeft: 16,
      paddingRight: 16,
      right: '10%',
      transform: [{ translateX: 16 }, { translateY: 32 }, { rotate: '10deg' }, { scaleX: 2 }, { scaleY: 2 }],
    });
  });

  it('rejects selector resources and each unresolved native value form', () => {
    expect(() => create({ value: 'space-x-2' })).toThrow('browser-only utility');
    expect(() => create({ value: 'bg-red-500/50' })).toThrow('resolve to a native color');
    expect(() => create({ value: '[color:var(--brand)]' })).toThrow('resolve to a native color');
  });
});
