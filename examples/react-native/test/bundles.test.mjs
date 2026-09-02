import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import test from 'node:test';

for (const output of ['build/android/index.bundle', 'build/ios/main.jsbundle']) {
  test(`${output} is a non-empty production bundle`, async () => {
    assert.ok((await stat(new URL(`../${output}`, import.meta.url))).size > 10_000);
  });
}
