'use client';

import { sx } from '@cssxio/cssx';

/** Exercises CSSX from Next's client compiler. */
export function ClientCssx() {
  return <span data-cssx-client className={sx('hidden text-white')} />;
}
