import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const mode = args.includes('--url') ? 'remote' : 'local';
const baseUrl = args[args.indexOf('--url') + 1]?.replace(/\/?$/, '/');
const allowInsecureTls = args.includes('--insecure');

if (allowInsecureTls) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const checks = [];

function ok(name, condition, detail = '') {
  checks.push({ name, ok: !!condition, detail });
}

function readLocal(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function validateHtml(html) {
  ok('HTML tem title', /<title>\s*Bloco BR\s*<\/title>/i.test(html));
  ok('HTML aponta manifest', html.includes('manifest.webmanifest'));
  ok('HTML aponta icone', html.includes('assets/icon.svg'));
  ok('HTML registra service worker', html.includes('serviceWorker') && html.includes('./sw.js'));
  ok('HTML tem viewport mobile', /viewport[^>]+viewport-fit=cover/i.test(html));

  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]).join('\n');
  try {
    new Function(scripts);
    ok('JavaScript inline compila', true);
  } catch (error) {
    ok('JavaScript inline compila', false, error.message);
  }
}

function validateManifest(manifestText) {
  let manifest;
  try {
    manifest = JSON.parse(manifestText);
    ok('Manifest JSON valido', true);
  } catch (error) {
    ok('Manifest JSON valido', false, error.message);
    return;
  }
  ok('Manifest display standalone', manifest.display === 'standalone');
  ok('Manifest orientacao portrait', manifest.orientation === 'portrait');
  ok('Manifest tem icone', Array.isArray(manifest.icons) && manifest.icons.some(icon => icon.src === 'assets/icon.svg'));
  ok('Manifest start_url relativo', manifest.start_url === './');
}

function validateServiceWorker(swText) {
  try {
    new Function(swText);
    ok('Service worker compila', true);
  } catch (error) {
    ok('Service worker compila', false, error.message);
  }
  ok('Service worker cacheia index', swText.includes('./index.html'));
  ok('Service worker cacheia manifest', swText.includes('./manifest.webmanifest'));
  ok('Service worker cacheia icone', swText.includes('./assets/icon.svg'));
}

async function fetchText(url, retries = 4) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'BlocoBR-smoke-test' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 1500 * (i + 1)));
    }
  }
  throw lastError;
}

async function runLocal() {
  ['index.html', 'manifest.webmanifest', 'sw.js', 'assets/icon.svg'].forEach(file => {
    ok(`Arquivo existe: ${file}`, fs.existsSync(path.join(root, file)));
  });
  validateHtml(readLocal('index.html'));
  validateManifest(readLocal('manifest.webmanifest'));
  validateServiceWorker(readLocal('sw.js'));
}

async function runRemote() {
  if (!baseUrl || !/^https?:\/\//.test(baseUrl)) {
    throw new Error('Use: node scripts/smoke-test.mjs --url https://exemplo/');
  }
  const [html, manifest, sw, icon] = await Promise.all([
    fetchText(baseUrl),
    fetchText(new URL('manifest.webmanifest', baseUrl)),
    fetchText(new URL('sw.js', baseUrl)),
    fetchText(new URL('assets/icon.svg', baseUrl)),
  ]);
  ok('Site publicado responde', html.includes('<!DOCTYPE html>'));
  ok('Icone publicado responde', icon.includes('<svg'));
  validateHtml(html);
  validateManifest(manifest);
  validateServiceWorker(sw);
}

if (mode === 'remote') await runRemote();
else await runLocal();

const failed = checks.filter(check => !check.ok);
for (const check of checks) {
  const status = check.ok ? 'OK' : 'FAIL';
  console.log(`${status} ${check.name}${check.detail ? ` - ${check.detail}` : ''}`);
}

if (failed.length) {
  console.error(`\n${failed.length} smoke check(s) failed.`);
  process.exit(1);
}

console.log(`\n${checks.length} smoke check(s) passed.`);
