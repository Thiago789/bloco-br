import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const mode = args.includes('--url') ? 'remote' : 'local';
const baseUrl = args[args.indexOf('--url') + 1]?.replace(/\/?$/, '/');
const allowInsecureTls = args.includes('--insecure');
const waitFresh = args.includes('--wait-fresh');
const expectedAppVersion = readExpectedAppVersion();

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

function readExpectedAppVersion() {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  return html.match(/const APP_VERSION='([^']+)'/)?.[1] || '';
}

function validateHtml(html) {
  ok('HTML tem title', /<title>\s*Bloco BR\s*<\/title>/i.test(html));
  ok('HTML aponta manifest', html.includes('manifest.webmanifest'));
  ok('HTML aponta icone', html.includes('assets/icon.svg'));
  ok('HTML registra service worker', html.includes('serviceWorker') && html.includes('./sw.js'));
  ok('HTML tem viewport mobile', /viewport[^>]+viewport-fit=cover/i.test(html));
  ok('HTML tem botao de feedback beta', html.includes('id="btn-beta-feedback"'));
  ok('HTML tem funcao de feedback beta', html.includes('function openBetaFeedback()'));
  ok('Feedback aponta issues do GitHub', html.includes('github.com/Thiago789/bloco-br/issues/new'));
  ok('HTML tem versao beta centralizada', html.includes("const APP_VERSION='1.0.9-beta'"));
  ok('Feedback inclui versao do app', html.includes('`- Versao: ${APP_VERSION}`'));
  ok('HTML tem botao de diagnostico beta', html.includes('id="btn-copy-diagnostics"'));
  ok('HTML copia diagnostico beta', html.includes('function copyBetaDiagnostics()') && html.includes('function betaDiagnosticsText()'));
  ok('HTML tem guia de primeira sessao', html.includes('id="first-session-card"'));
  ok('HTML tem passos da primeira sessao', html.includes('FIRST_SESSION_STEPS'));
  ok('HTML atualiza guia de primeira sessao', html.includes('function updateFirstSessionCard()'));
  ok('Primeira missao tem vitoria rapida', html.includes("{name:'Fortaleza - CE',icon:'🏖️',desc:'Calçadão de Iracema',goal:'linhas',target:1"));
  ok('Objetivo usa verbo de acao', html.includes('function objectiveAction(city)') && html.includes('function objectivePlainText(city'));
  ok('Feedback de objetivo ajusta singular e plural', html.includes('function objectiveUnit(city') && html.includes("remaining===1?'falta':'faltam'"));
  ok('Abertura tem bandeja guiada', html.includes('function openingTray()') && html.includes('function shouldUseOpeningTray()'));
  ok('Abertura usa dica visual sem booster', html.includes('function maybeShowOpeningAssist()') && html.includes('hintTimer=setTimeout'));
  ok('Perda de vida gera bandeja de recuperacao', html.includes('function spawnRecoveryPieces()') && html.includes('Nova chance: peças menores para respirar.'));
  ok('Quiz regional tem recompensa dinamica', html.includes('function regionalQuizReward()'));
  ok('Quiz regional escala por estrelas', html.includes('stars>=3?2:1') && html.includes('Bônus cultural perfeito'));
  validateMobileContracts(html);

  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(match => match[1]).join('\n');
  try {
    new Function(scripts);
    ok('JavaScript inline compila', true);
  } catch (error) {
    ok('JavaScript inline compila', false, error.message);
  }
}

function getCssBlock(html, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = html.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'i'));
  return match?.[1] || '';
}

function hasCssValue(block, property, expectedPattern) {
  return new RegExp(`${property}\\s*:\\s*${expectedPattern}`, 'i').test(block);
}

function cssSize(block, property) {
  const match = block.match(new RegExp(`${property}\\s*:\\s*(\\d+)px`, 'i'));
  return match ? Number(match[1]) : 0;
}

function validateMobileContracts(html) {
  [
    ['settings', '#btn-settings-float', '#ov-settings', '#settings-panel', 'openSettings()'],
    ['profile', '#btn-profile-float', '#ov-profile', '#profile-panel', 'openProfile()'],
    ['journey', '#btn-map-float', '#ov-journey', '#journey-panel', 'openJourney()'],
  ].forEach(([name, button, overlay, panel, opener]) => {
    ok(`${name}: botao existe`, html.includes(`id="${button.slice(1)}"`));
    ok(`${name}: overlay existe`, html.includes(`id="${overlay.slice(1)}"`));
    ok(`${name}: painel existe`, html.includes(`id="${panel.slice(1)}"`));
    ok(`${name}: funcao de abertura existe`, html.includes(`function ${opener.replace('()', '')}`));

    const buttonCss = getCssBlock(html, button);
    const panelCss = getCssBlock(html, panel);
    ok(`${name}: botao usa touch-action`, hasCssValue(buttonCss, 'touch-action', 'manipulation'));
    ok(`${name}: alvo de toque >=34px`, cssSize(buttonCss, 'width') >= 34 && cssSize(buttonCss, 'height') >= 34);
    ok(`${name}: painel rola verticalmente`, hasCssValue(panelCss, 'overflow-y', 'auto'));
    ok(`${name}: painel respeita altura mobile`, panelCss.includes('100dvh') || hasCssValue(panelCss, 'max-height', '90vh'));
    ok(`${name}: painel permite pan-y`, hasCssValue(panelCss, 'touch-action', 'pan-y'));
  });
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
  ok('Service worker usa rede primeiro no HTML', swText.includes('wantsHtml') && swText.includes('fetch(event.request)'));
  ok('Service worker mantem fallback offline', swText.includes("caches.match('./index.html')"));
}

async function fetchText(url, retries = 4) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'user-agent': 'BlocoBR-smoke-test',
          'cache-control': 'no-cache',
          pragma: 'no-cache',
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 1500 * (i + 1)));
    }
  }
  throw lastError;
}

function cacheBust(url) {
  const fresh = new URL(url);
  fresh.searchParams.set('smoke', `${Date.now()}`);
  return fresh;
}

async function fetchFreshHtml() {
  let html = '';
  const attempts = waitFresh ? 12 : 1;
  for (let i = 0; i < attempts; i++) {
    html = await fetchText(cacheBust(baseUrl), 2);
    if (!waitFresh || html.includes(`const APP_VERSION='${expectedAppVersion}'`)) return html;
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  return html;
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
    fetchFreshHtml(),
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
