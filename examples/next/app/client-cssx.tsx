'use client';

import { sx } from '@cssxio/cssx';
import { useState } from 'react';

import { HmrProbe } from './hmr-probe';

/** Exercises CSSX from Next's client compiler. */
export function ClientCssx() {
  const [active, setActive] = useState(false);
  return (
    <section>
      <span data-cssx-client className={sx('inline-block rounded-md bg-brand p-3 text-white')}>
        Client style
      </span>
      <button
        data-cssx-toggle
        type="button"
        className={sx(active ? 'bg-red-500' : 'bg-blue-500')}
        onClick={() => setActive(!active)}
      >
        Change style
      </button>
      <HmrProbe />
    </section>
  );
}
