/**
 * Pre-render the SSR app into static HTML for GitHub Pages.
 *
 * 1. Starts the built Nitro server on a random port
 * 2. Fetches each route to get the server-rendered HTML
 * 3. Writes the HTML + public assets to a `dist-static/` folder
 * 4. Adds a 404.html (copy of index) for SPA client-side routing
 */
import { spawn } from 'node:child_process';
import { mkdir, cp, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUTPUT = join(ROOT, 'dist-pages');
const SERVER = join(ROOT, '.output/server/index.mjs');
const PUBLIC = join(ROOT, '.output/public');
const PORT = 4199;

const ROUTES = [
  '/',
  '/bids',
  '/jobs',
  '/tickets',
  '/equipment',
  '/crew',
  '/services',
  '/reports',
  '/projections',
  '/admin/metrics',
];

async function fetchPage(route) {
  const url = `http://127.0.0.1:${PORT}${route}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${route} -> ${res.status}`);
  return res.text();
}

async function main() {
  // Clean & create output dir
  await mkdir(OUTPUT, { recursive: true });

  // Copy public assets
  await cp(PUBLIC, join(OUTPUT, 'assets'), { recursive: true });
  // Flatten: assets are at /assets/* in the public dir
  const assetsDir = join(PUBLIC, 'assets');
  try {
    await cp(assetsDir, join(OUTPUT, 'assets'), { recursive: true });
  } catch {
    // Already copied above
  }

  // Start server
  console.log('Starting server...');
  const server = spawn('node', [SERVER], {
    env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  // Wait for server to be ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      await fetch(`http://127.0.0.1:${PORT}/`);
      ready = true;
      break;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  if (!ready) {
    server.kill();
    throw new Error('Server did not start');
  }

  console.log('Server ready. Pre-rendering routes...');

  // Fetch each route
  for (const route of ROUTES) {
    try {
      let html = await fetchPage(route);

      // Fix asset paths for GitHub Pages (repo-relative)
      // Assets are served from /assets/ — keep as-is for now

      const filePath = route === '/'
        ? join(OUTPUT, 'index.html')
        : join(OUTPUT, route.slice(1), 'index.html');

      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, html);
      console.log(`  ${route} -> ${filePath.replace(OUTPUT, 'dist-pages')}`);
    } catch (err) {
      console.warn(`  ${route} -> FAILED: ${err.message}`);
    }
  }

  // Copy root index as 404.html for SPA fallback
  const indexHtml = await fetchPage('/');
  await writeFile(join(OUTPUT, '404.html'), indexHtml);
  console.log('  404.html (SPA fallback)');

  // Add .nojekyll to prevent GitHub from processing with Jekyll
  await writeFile(join(OUTPUT, '.nojekyll'), '');

  server.kill();
  console.log('\nDone! Output in dist-pages/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
