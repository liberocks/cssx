'use client';

import { sx } from '@cssxio/cssx';

export function HmrProbe() {
  return (
    <div data-cssx-hmr className={sx('p-2 bg-blue-500')}>
      HMR style
    </div>
  );
}
