import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const vendorRoot = path.join(root, 'vendor', 'obsidian-clipper');
const require = createRequire(import.meta.url);

let esbuild;
try {
  esbuild = require(path.join(vendorRoot, 'node_modules', 'esbuild'));
} catch {
  console.error('Missing vendor dependencies. Run: npm install --prefix vendor/obsidian-clipper');
  process.exit(1);
}

await esbuild.build({
  entryPoints: [path.join(vendorRoot, 'src', 'api.ts')],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  outfile: path.join(vendorRoot, 'dist', 'api.browser.mjs'),
  define: {
    DEBUG_MODE: 'false'
  },
  alias: {
    'webextension-polyfill': path.join(vendorRoot, 'src', 'utils', 'cli-stubs.ts')
  },
  logLevel: 'info'
});

console.log('Built vendor/obsidian-clipper/dist/api.browser.mjs');
