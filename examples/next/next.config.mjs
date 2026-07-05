import cssx from '@cssxio/unplugin/webpack';

const theme = `
@theme reference {
  --color-brand: #171717;
}
`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.plugins.push(cssx({ cssFileName: 'static/cssx.css', theme }));
    return config;
  },
};

export default nextConfig;
