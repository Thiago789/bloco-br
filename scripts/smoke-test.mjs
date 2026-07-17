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
  ok('HTML tem versao beta centralizada', html.includes("const APP_VERSION='1.2.9-beta'"));
  ok('Feedback inclui versao do app', html.includes('`- Versao: ${APP_VERSION}`'));
  ok('HTML tem botao de diagnostico beta', html.includes('id="btn-copy-diagnostics"'));
  ok('HTML copia diagnostico beta', html.includes('function copyBetaDiagnostics()') && html.includes('function betaDiagnosticsText()'));
  ok('HTML tem guia de primeira sessao', html.includes('id="first-session-card"'));
  ok('HTML tem passos da primeira sessao', html.includes('FIRST_SESSION_STEPS'));
  ok('HTML atualiza guia de primeira sessao', html.includes('function updateFirstSessionCard()'));
  ok('Primeira missao tem vitoria rapida', html.includes("{name:'Fortaleza - CE',icon:'🏖️',desc:'Calçadão de Iracema',goal:'linhas',target:1"));
  ok('Objetivo usa verbo de acao', html.includes('function objectiveAction(city)') && html.includes('function objectivePlainText(city'));
  ok('Feedback de objetivo ajusta singular e plural', html.includes('function objectiveUnit(city') && html.includes("remaining===1?'falta':'faltam'"));
  ok('Proxima cidade tem mensagem contextual', html.includes('function missionStartMessage(city)') && html.includes('Combos aceleram'));
  ok('Blocos tem simbolos culturais sutis', html.includes('function drawBlockMotif') && html.includes('function blockMotifIndex'));
  ok('Simbolos dos blocos tem brilho animado', html.includes('function drawBlockMotifAt') && html.includes('now()*0.004') && html.includes('shadowBlur=s*0.08'));
  ok('Encaixe tem microqueda visual', html.includes('function spawnPlacementImpact') && html.includes('function placementImpactFor'));
  ok('Preview mostra linhas que serao limpas', html.includes('function previewCompletionCells') && html.includes('function drawPreviewClearGlow'));
  ok('Preview mostra pontos antes de soltar', html.includes('function previewCompletionStats') && html.includes('previewClearGain') && html.includes('Combo x${previewClearCombos}'));
  ok('Pecas podem girar por toque', html.includes('function rotateShape') && html.includes('function rotateTrayPiece') && html.includes('canRotateShape(shape)'));
  ok('Rotacao sugere jogada de limpeza', html.includes('function bestClearingMoveForShape') && html.includes('Giro abriu Combo x'));
  ok('Dicas visuais expiram sozinhas', html.includes('function scheduleHintClear') && html.includes('scheduleHintClear(3800)'));
  ok('Abertura tem bandeja guiada', html.includes('function openingTray()') && html.includes('function shouldUseOpeningTray()'));
  ok('Abertura usa dica visual sem booster', html.includes('function maybeShowOpeningAssist()') && html.includes('hintTimer=setTimeout'));
  ok('Perda de vida gera bandeja de recuperacao', html.includes('function spawnRecoveryPieces()') && html.includes('Nova chance: peças menores para respirar.'));
  ok('Quiz regional tem recompensa dinamica', html.includes('function regionalQuizReward()'));
  ok('Quiz regional escala por estrelas', html.includes('stars>=3?2:1') && html.includes('Bônus cultural perfeito'));
  ok('Chuva BR tem entrada experimental', html.includes('Testar Chuva BR') && html.includes('function startRainMode()'));
  ok('Desafios tem alvo de toque acessivel', html.includes('id="btn-challenge-float"') && html.includes('aria-label="Abrir desafios"'));
  ok('Chuva BR usa uma peca por vez', html.includes('function spawnRainPiece()') && html.includes('pieces=[null,{shape,color},null]'));
  ok('Chuva BR tem cronometro e resultado', html.includes('RAIN_DURATION_MS=60000') && html.includes('function finishRainMode(reason)') && html.includes('id="ov-rain-result"'));
  ok('Linhas dao tempo no Chuva BR', html.includes('rainEndsAt+=combos*3000'));
  ok('Chuva BR destaca novo recorde', html.includes('id="rain-result-badge"') && html.includes("badge.textContent=previousBest>0?'NOVO RECORDE':'PRIMEIRO RECORDE'"));
  ok('Chuva BR mostra distancia do recorde', html.includes('FALTARAM ${gap.toLocaleString') && html.includes('id="rain-result-message"'));
  ok('Chuva BR cria meta de revanche', html.includes('id="rain-retry"') && html.includes('Superar ${rainBest.toLocaleString'));
  ok('Entrada da Chuva BR lembra o recorde', html.includes('function updateRainPreview()') && html.includes('id="rain-preview-btn"'));
  ok('Reset limpa historico da Chuva BR', html.includes("'bbr2_rain_best','bbr2_rain_last','bbr2_rain_plays'"));
  ok('Chuva BR pausa quando o app fica oculto', html.includes('function handleGameVisibilityChange()') && html.includes("document.addEventListener('visibilitychange',handleGameVisibilityChange)"));
  ok('Chuva BR preserva o tempo ao retornar', html.includes('rainEndsAt+=pausedFor') && html.includes('rainDropStartedAt+=pausedFor'));
  ok('Cronometro ignora atualizacao durante pausa', html.includes('if(!inRainMode||rainFinished||rainPausedAt)return'));
  ok('Chuva BR alerta nos ultimos dez segundos', html.includes("rainBar.classList.toggle('urgent',urgent)") && html.includes('#rain-bar.urgent'));
  ok('Alerta visual respeita animacoes', html.includes("rainBar.classList.toggle('pulse',urgent&&settings.animations)") && html.includes('@keyframes rainUrgency'));
  ok('Chuva BR tem contagem sonora final', html.includes('function soundRainCountdown(seconds)') && html.includes('seconds<1||seconds>5'));
  ok('Fim da Chuva BR limpa alerta de urgencia', html.includes("classList.remove('show','urgent','pulse','danger')"));
  ok('Recompensa diaria espera a primeira jogada', html.includes('pendingDailyReward=true') && html.includes('function maybeShowDeferredDailyReward()'));
  ok('Alvos flutuantes acompanham o canvas', html.includes('function syncFloatingHitAreas()') && html.includes('positionFloatingButton'));
  ok('Fim de jogo mostra progresso da missao', html.includes('id="go-mission-fill"') && html.includes('function renderGameOverInsights(city)'));
  ok('Fim de jogo explica quanto faltou', html.includes('function gameOverMissionMessage(city)') && html.includes('Foi por pouco'));
  ok('Fim de jogo destaca melhor jogada', html.includes('bestMoveGain') && html.includes('id="go-best-move"'));
  ok('Revanche zera estatisticas da rodada', html.includes('function resetMissionRunStats()') && html.includes('score=0;lives=3;goal=0'));
  ok('Revanche e a acao principal', html.includes('↺ Tentar bater meu recorde') && html.includes('.go-btn-retry{order:-3'));
  ok('Canvas preserva proporcao em telas largas', html.includes('centeredViewport=(W/H)>.66') && html.includes('fitScale=Math.min(W/VW,H/VH)'));
  ok('Canvas centralizado corrige coordenadas de toque', html.includes('(cx-viewOffsetX)/scaleX') && html.includes('(cy-viewOffsetY)/scaleY'));
  ok('Efeitos acompanham deslocamento do canvas', html.includes('viewOffsetX+x*scaleX-20') && html.includes('viewOffsetY+y*scaleY-20'));
  ok('Alvos de toque ficam centralizados nos icones', html.includes('(hitW-scaledW)/2') && html.includes('(hitH-scaledH)/2'));
  ok('Peca sobe acima do dedo no celular', html.includes('const TOUCH_DRAG_LIFT=58') && html.includes('function dragPosition(x,y)'));
  ok('Elevacao se aplica apenas ao toque', html.includes('drag.isTouch&&drag.moved') && html.includes('isTouch:!!(e.touches||e.changedTouches)'));
  ok('Preview usa a posicao elevada', html.includes('drag.tx=pos.x;drag.ty=pos.y') && html.includes('updateDragAnchor(pos.x,pos.y)'));
  ok('Toque tem assistencia magnetica nas bordas', html.includes('const TOUCH_SNAP_MARGIN=18') && html.includes('function dragAnchorAt(x,y,shape)'));
  ok('Assistencia magnetica nao altera o mouse', html.includes('if(!drag||!drag.isTouch)return next'));
  ok('Encaixe valido tem retorno tatil', html.includes('function updateDragAnchor(x,y,withFeedback=true)') && html.includes('withFeedback&&drag.isTouch') && html.includes('valid&&!drag.anchorValid'));
  ok('Preview de linha tem retorno tatil distinto', html.includes('clears&&!drag.clearingPreview') && html.includes('vibrate([8,16,8])'));
  ok('Geracao simula a sequencia completa da bandeja', html.includes('function trayHasPlayableSequence(tray,maxNodes=180)') && html.includes('return search(board,tray)'));
  ok('Simulacao considera limpeza de linhas', html.includes('function simulatePlacement(state,shape,r,c)') && html.includes('fullRows.forEach') && html.includes('fullCols.forEach'));
  ok('Bandeja segura ganha prioridade no grid cheio', html.includes("sequenceSafe?(occupancy>.45?90:28):-320"));
  ok('Busca de bandeja tem limite de desempenho', html.includes('const budget={left:maxNodes}') && html.includes('if(--budget.left<0)return false'));
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
