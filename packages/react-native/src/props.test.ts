import { expect, it } from 'vitest';

import { create } from './create';
import { props } from './props';

it('returns a merged style prop for compiled and nested conditional inputs', () => {
  const styles = create({ first: 'p-2', second: 'p-4' });

  expect(props(styles.first, [false, null, undefined, styles.second])).toEqual({ style: { padding: 16 } });
  expect(props()).toEqual({ style: {} });
});
