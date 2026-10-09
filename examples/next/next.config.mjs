import { withCSSX } from '@cssxio/unplugin/next';

const theme = `
@theme reference {
  --color-brand: #171717;
}
`;

/** @type {import('next').NextConfig} */
const nextConfig = withCSSX({}, { theme, mdx: {} });

export default nextConfig;
