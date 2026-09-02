import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import test from 'node:test';

for (const platform of ['android', 'ios']) {
  test(`Expo emits a ${platform} production export`, async () => {
    const files = await readdir(new URL(`../dist/${platform}/_expo/static/js/${platform}`, import.meta.url));
    assert.ok(files.some((file) => file.endsWith('.js') || file.endsWith('.hbc')));
  });
}
