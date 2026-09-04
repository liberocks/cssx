import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const host = process.argv[2];
if (!host) throw new Error('Usage: node tests/scripts/prepare-react-native-host.mjs <generated-host-directory>');

const root = resolve(import.meta.dirname, '../..');
const hostRoot = resolve(host);
const vendorPackage = resolve(hostRoot, 'vendor/cssx-react-native');
const vendorCompiler = resolve(hostRoot, 'vendor/cssx-compiler');
const manifestPath = resolve(hostRoot, 'package.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const packageManifest = JSON.parse(await readFile(resolve(root, 'packages/react-native/package.json'), 'utf8'));

await mkdir(vendorPackage, { recursive: true });
await mkdir(vendorCompiler, { recursive: true });
await cp(resolve(root, 'packages/react-native/dist'), resolve(vendorPackage, 'dist'), { recursive: true });
await cp(resolve(root, 'packages/compiler/dist'), resolve(vendorCompiler, 'dist'), { recursive: true });
await cp(resolve(root, 'packages/compiler/package.json'), resolve(vendorCompiler, 'package.json'));
packageManifest.dependencies['@cssxio/compiler'] = 'file:../cssx-compiler';
await writeFile(resolve(vendorPackage, 'package.json'), `${JSON.stringify(packageManifest, null, 2)}\n`);
manifest.dependencies['@cssxio/react-native'] = 'file:vendor/cssx-react-native';
manifest.dependencies['@cssxio/compiler'] = 'file:vendor/cssx-compiler';
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

await cp(resolve(root, 'examples/react-native/src/App.tsx'), resolve(hostRoot, 'App.tsx'));
await cp(resolve(root, 'examples/react-native/babel.config.js'), resolve(hostRoot, 'babel.config.js'));

console.log(`Prepared React Native host at ${hostRoot}.`);
