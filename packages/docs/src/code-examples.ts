export const install = 'pnpm add @cssxio/cssx\npnpm add -D @cssxio/unplugin';
export const config =
  "import { defineConfig } from 'vite';\nimport cssx from '@cssxio/unplugin/vite';\n\nexport default defineConfig({\n  plugins: [cssx({ cssFileName: 'assets/cssx.css' })],\n});";
export const usage =
  "import { sx } from '@cssxio/cssx';\n\nexport function Button() {\n  return (\n    <button className={sx(\n      'rounded-lg bg-emerald-600 px-4 py-2 text-white',\n      'hover:bg-emerald-700',\n    )}>\n      Get started\n    </button>\n  );\n}";
export const patterns =
  "import * as cssx from '@cssxio/cssx';\n\nconst styles = cssx.create({\n  button: 'rounded-lg bg-emerald-600 px-4 py-2 text-white',\n  disabled: 'cursor-not-allowed opacity-50',\n});\n\n<button {...cssx.props(styles.button, isDisabled && styles.disabled)} />";
