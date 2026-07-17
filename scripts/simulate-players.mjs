import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

function readLiteral(name) {
  const match = html.match(new RegExp(`const ${name}=([\\s\\S]*?);\\r?\\n`));
  if (!match) throw new Error(`Nao foi possivel ler ${name} do jogo.`);
  return Function(`"use strict"; return (${match[1]});`)();
}

const N = Number(html.match(/const N=(\d+);/)?.[1]);
const APP_VERSION = html.match(/const APP_VERSION='([^']+)'/)?.[1] || 'desconhecida';
const SHAPES_EASY = readLiteral('SHAPES_EASY');
const SHAPES_MED = readLiteral('SHAPES_MED');
const SHAPES_HARD = readLiteral('SHAPES_HARD');
const CITIES = readLiteral('CITIES');

const PROFILES = [
  { id: 'novato', name: 'Novato', mode: 'weighted', rotation: 0.20, errorRate: 0.16, reaction: 3200, line: 65, combo: 20, setup: 1.4, space: 0.3, risk: 8, noise: 90 },
  { id: 'aleatorio', name: 'Aleatorio', mode: 'random', rotation: 0.35, errorRate: 0.09, reaction: 2300, line: 0, combo: 0, setup: 0, space: 0, risk: 0, noise: 0 },
  { id: 'cauteloso', name: 'Cauteloso', mode: 'weighted', rotation: 0.70, errorRate: 0.04, reaction: 2800, line: 70, combo: 20, setup: 1.8, space: 1.7, risk: 32, noise: 28 },
  { id: 'linhas', name: 'Cacador de linhas', mode: 'weighted', rotation: 0.82, errorRate: 0.03, reaction: 1900, line: 190, combo: 70, setup: 2.0, space: 0.5, risk: 10, noise: 18 },
  { id: 'combos', name: 'Estrategista de combos', mode: 'weighted', rotation: 0.90, errorRate: 0.02, reaction: 2200, line: 150, combo: 180, setup: 3.1, space: 0.8, risk: 16, noise: 14 },
  { id: 'especialista', name: 'Especialista', mode: 'weighted', rotation: 1, errorRate: 0.01, reaction: 1250, line: 175, combo: 130, setup: 2.5, space: 1.8, risk: 28, noise: 7 },
  { id: 'impaciente', name: 'Impaciente', mode: 'quick', rotation: 0.45, errorRate: 0.12, reaction: 900, line: 90, combo: 30, setup: 0.8, space: 0.2, risk: 5, noise: 55 },
  { id: 'caotico', name: 'Caotico', mode: 'random', rotation: 0.65, errorRate: 0.30, reaction: 1800, line: 0, combo: 0, setup: 0, space: 0, risk: 0, noise: 0 },
];

function hashSeed(value) {
  let h = 2166136261;
  for (const char of String(value)) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createRng(seed) {
  let state = hashSeed(seed) || 1;
  const next = () => {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.int = max => Math.floor(next() * max);
  next.pick = items => items[next.int(items.length)];
  return next;
}

function emptyBoard() {
  return Array.from({ length: N }, () => Array(N).fill(null));
}

function copyBoard(board) {
  return board.map(row => row.slice());
}

function shapeKey(shape) {
  return `${shape.length}x${shape[0].length}:${shape.map(row => row.join('')).join('|')}`;
}

function rotateShape(shape) {
  return Array.from({ length: shape[0].length }, (_, c) =>
    Array.from({ length: shape.length }, (_, r) => shape[shape.length - 1 - r][c]));
}

function shapeOrientations(shape, allowRotation) {
  if (!allowRotation) return [shape];
  const result = [];
  const seen = new Set();
  let current = shape;
  for (let i = 0; i < 4; i++) {
    const key = shapeKey(current);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(current);
    }
    current = rotateShape(current);
  }
  return result;
}

function shapeCells(shape) {
  return shape.flat().filter(Boolean).length;
}

function canPlace(board, shape, row, col) {
  for (let dr = 0; dr < shape.length; dr++) {
    for (let dc = 0; dc < shape[0].length; dc++) {
      if (!shape[dr][dc]) continue;
      const r = row + dr;
      const c = col + dc;
      if (r < 0 || r >= N || c < 0 || c >= N || board[r][c]) return false;
    }
  }
  return true;
}

function applyPlacement(board, shape, row, col) {
  const next = copyBoard(board);
  for (let dr = 0; dr < shape.length; dr++) {
    for (let dc = 0; dc < shape[0].length; dc++) {
      if (shape[dr][dc]) next[row + dr][col + dc] = 1;
    }
  }
  const rows = [];
  const cols = [];
  for (let r = 0; r < N; r++) if (next[r].every(Boolean)) rows.push(r);
  for (let c = 0; c < N; c++) if (next.every(line => line[c])) cols.push(c);
  const cleared = new Set();
  rows.forEach(r => { for (let c = 0; c < N; c++) cleared.add(r * N + c); });
  cols.forEach(c => { for (let r = 0; r < N; r++) cleared.add(r * N + c); });
  for (const index of cleared) next[Math.floor(index / N)][index % N] = null;
  return { board: next, lines: rows.length + cols.length, cleared: cleared.size };
}

function occupancy(board) {
  return board.flat().filter(Boolean).length / (N * N);
}

function setupPotential(board) {
  let score = 0;
  for (let r = 0; r < N; r++) {
    const filled = board[r].filter(Boolean).length;
    if (filled < N) score += filled * filled;
  }
  for (let c = 0; c < N; c++) {
    const filled = board.filter(row => row[c]).length;
    if (filled < N) score += filled * filled;
  }
  return score;
}

function largestEmptyRegion(board) {
  const seen = new Set();
  let largest = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const start = r * N + c;
    if (board[r][c] || seen.has(start)) continue;
    const queue = [[r, c]];
    seen.add(start);
    let size = 0;
    while (queue.length) {
      const [cr, cc] = queue.pop();
      size++;
      for (const [nr, nc] of [[cr - 1, cc], [cr + 1, cc], [cr, cc - 1], [cr, cc + 1]]) {
        const key = nr * N + nc;
        if (nr < 0 || nr >= N || nc < 0 || nc >= N || board[nr][nc] || seen.has(key)) continue;
        seen.add(key);
        queue.push([nr, nc]);
      }
    }
    largest = Math.max(largest, size);
  }
  return largest;
}

function poolForLevel(level) {
  if (level <= 2) return [...SHAPES_EASY, ...SHAPES_MED];
  if (level <= 4) return [...SHAPES_EASY, ...SHAPES_MED, ...SHAPES_MED, ...SHAPES_HARD.slice(0, 2)];
  if (level <= 7) return [...SHAPES_MED, ...SHAPES_MED, ...SHAPES_HARD];
  return [...SHAPES_MED, ...SHAPES_HARD, ...SHAPES_HARD];
}

function countMoves(board, shape) {
  let count = 0;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if (canPlace(board, shape, r, c)) count++;
  }
  return count;
}

function trayHasSequence(board, tray, maxNodes = 180) {
  const budget = { left: maxNodes };
  function search(state, remaining) {
    if (!remaining.length) return true;
    for (let i = 0; i < remaining.length; i++) {
      const shape = remaining[i].shape;
      const rest = remaining.filter((_, index) => index !== i);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (!canPlace(state, shape, r, c)) continue;
        if (--budget.left < 0) return false;
        const next = applyPlacement(state, shape, r, c).board;
        if (search(next, rest)) return true;
      }
    }
    return false;
  }
  return search(board, tray);
}

function scoreTray(board, tray, city, fase) {
  let playable = 0;
  let totalMoves = 0;
  let objectiveFit = 0;
  let smallCount = 0;
  for (const piece of tray) {
    const moves = countMoves(board, piece.shape);
    if (moves > 0) playable++;
    totalMoves += Math.min(12, moves);
    const cells = shapeCells(piece.shape);
    if (cells <= 3) smallCount++;
    if (city.goal === 'combo' && Math.max(piece.shape.length, piece.shape[0].length) >= 3) objectiveFit += 8;
    if (city.goal === 'pecas' && cells <= 4) objectiveFit += 8;
    if (city.goal === 'linhas' && cells >= 3) objectiveFit += 5;
  }
  if (!playable) return -999;
  const variety = new Set(tray.map(piece => shapeKey(piece.shape))).size;
  const earlyEase = fase < 2 && smallCount >= 1 ? 16 : 0;
  const safe = trayHasSequence(board, tray);
  const sequenceScore = safe ? (occupancy(board) > 0.45 ? 90 : 28) : -320;
  return playable * 28 + totalMoves * 3 + objectiveFit + variety * 6 + earlyEase + sequenceScore;
}

function generateTray(state, city, rng) {
  const pool = poolForLevel(state.level);
  let best = null;
  let bestScore = -Infinity;
  for (let attempt = 0; attempt < 36; attempt++) {
    const used = new Set();
    const tray = [];
    for (let i = 0; i < 3; i++) {
      let shape = rng.pick(pool);
      for (let tries = 0; tries < 12 && used.has(shapeKey(shape)); tries++) shape = rng.pick(pool);
      used.add(shapeKey(shape));
      tray.push({ shape });
    }
    const candidateScore = scoreTray(state.board, tray, city, state.fase);
    if (candidateScore > bestScore) {
      bestScore = candidateScore;
      best = tray;
    }
    if (candidateScore >= 80) break;
  }
  return best || [{ shape: [[1]] }, { shape: [[1, 1]] }, { shape: [[1], [1]] }];
}

function enumerateMoves(state, profile, rng) {
  const moves = [];
  state.pieces.forEach((piece, pieceIndex) => {
    if (!piece) return;
    const allowRotation = rng() < profile.rotation;
    for (const shape of shapeOrientations(piece.shape, allowRotation)) {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        if (!canPlace(state.board, shape, r, c)) continue;
        const result = applyPlacement(state.board, shape, r, c);
        const occ = occupancy(result.board);
        const quality = result.lines * profile.line
          + Math.max(0, result.lines - 1) * profile.combo
          + setupPotential(result.board) * profile.setup
          + largestEmptyRegion(result.board) * profile.space
          - occ * profile.risk * 10
          + rng() * profile.noise;
        moves.push({ pieceIndex, shape, row: r, col: c, result, quality });
      }
    }
  });
  return moves;
}

function chooseMove(moves, profile, rng) {
  if (!moves.length) return null;
  if (profile.mode === 'random') return rng.pick(moves);
  if (profile.mode === 'quick') {
    const sample = moves.slice(0, Math.min(12, moves.length));
    return sample.sort((a, b) => b.quality - a.quality)[0];
  }
  return moves.sort((a, b) => b.quality - a.quality)[0];
}

function recoverFromStuck(state, rng) {
  const firstPiece = state.pieces.findIndex(Boolean);
  if (!state.rescueUsed && firstPiece >= 0 && countMoves(state.board, [[1]]) > 0) {
    state.pieces[firstPiece] = { shape: [[1]] };
    state.rescueUsed = true;
    state.rescues++;
    return true;
  }
  state.pieces = state.pieces.map(piece => piece ? { shape: rng.pick(SHAPES_EASY) } : null);
  if (state.pieces.some(piece => piece && countMoves(state.board, piece.shape) > 0)) {
    state.shuffles++;
    return true;
  }
  state.lives--;
  if (state.lives <= 0) return false;
  const playable = SHAPES_EASY.filter(shape => countMoves(state.board, shape) > 0);
  if (!playable.length) return false;
  state.pieces = [{ shape: [[1]] }, { shape: rng.pick(playable) }, { shape: rng.pick(playable) }];
  return true;
}

function updateLevel(state, gain) {
  state.xp += gain;
  while (state.xp >= state.xpNext) {
    state.xp -= state.xpNext;
    state.level++;
    state.xpNext = Math.floor(state.xpNext * 1.3);
  }
}

function missionProgress(city, move, gain) {
  if (city.goal === 'score') return gain;
  if (city.goal === 'pecas') return 1;
  if (city.goal === 'combo') return move.result.lines > 1 ? 1 : 0;
  return move.result.lines;
}

function runMission(profile, cityIndex, seed, maxPlacements = 180) {
  const rng = createRng(seed);
  const city = CITIES[cityIndex];
  const state = {
    board: emptyBoard(), pieces: [], fase: cityIndex, level: 1, xp: 0, xpNext: 300,
    lives: 3, rescueUsed: false, rescues: 0, shuffles: 0,
  };
  let score = 0;
  let progress = 0;
  let placements = 0;
  let lines = 0;
  let comboMoves = 0;
  let chain = 0;
  let maxChain = 0;
  let invalidActions = 0;
  let maxOccupancy = 0;

  while (placements < maxPlacements && progress < city.target) {
    if (!state.pieces.some(Boolean)) state.pieces = generateTray(state, city, rng);
    let moves = enumerateMoves(state, profile, rng);
    if (!moves.length) {
      if (!recoverFromStuck(state, rng)) break;
      moves = enumerateMoves(state, profile, rng);
      if (!moves.length) break;
    }
    if (rng() < profile.errorRate) invalidActions++;
    const move = chooseMove(moves, profile, rng);
    if (!move) break;
    state.board = move.result.board;
    state.pieces[move.pieceIndex] = null;
    placements++;
    lines += move.result.lines;
    if (move.result.lines > 1) comboMoves++;
    if (move.result.lines > 0) chain++;
    else chain = 0;
    maxChain = Math.max(maxChain, chain);
    const chainBonus = move.result.lines > 0 ? Math.min(40, Math.max(0, chain - 1) * 10) : 0;
    const gain = move.result.lines > 0
      ? move.result.lines * 10 + move.result.cleared + (move.result.lines > 1 ? move.result.lines * 20 : 0) + chainBonus
      : 0;
    score += gain;
    updateLevel(state, gain);
    progress += missionProgress(city, move, gain);
    maxOccupancy = Math.max(maxOccupancy, occupancy(state.board));
  }

  return {
    cityIndex, city: city.name, completed: progress >= city.target, progress, target: city.target,
    placements, score, lines, comboMoves, maxChain, invalidActions,
    rescues: state.rescues, shuffles: state.shuffles, lives: state.lives,
    maxOccupancy: Number(maxOccupancy.toFixed(3)),
  };
}

function runRain(profile, seed) {
  const rng = createRng(seed);
  const state = { board: emptyBoard(), pieces: [], fase: 0, level: 1 };
  let elapsed = 0;
  let deadline = 60000;
  let score = 0;
  let pieces = 0;
  let lines = 0;
  let invalidActions = 0;

  while (elapsed < deadline && pieces < 120) {
    const pool = poolForLevel(state.level);
    const playable = pool.filter(shape => countMoves(state.board, shape) > 0);
    if (!playable.length) break;
    state.pieces = [{ shape: rng.pick(playable) }];
    const moves = enumerateMoves(state, profile, rng);
    const move = chooseMove(moves, profile, rng);
    if (!move) break;
    if (rng() < profile.errorRate) {
      invalidActions++;
      elapsed += 550;
    }
    elapsed += profile.reaction * (0.78 + rng() * 0.44);
    if (elapsed >= deadline) break;
    state.board = move.result.board;
    pieces++;
    lines += move.result.lines;
    score += shapeCells(move.shape);
    if (move.result.lines > 0) {
      score += move.result.lines * 10 + move.result.cleared + (move.result.lines > 1 ? move.result.lines * 20 : 0);
      deadline += move.result.lines * 3000;
    }
  }

  return { score, pieces, lines, invalidActions, duration: Math.round(Math.min(elapsed, deadline)) };
}

function mean(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function percent(value) {
  return `${Math.round(value * 100)}%`;
}

function aggregate(results, sessionsPerProfile, seed) {
  const profiles = PROFILES.map(profile => {
    const rows = results.filter(result => result.profile === profile.id);
    return {
      id: profile.id,
      name: profile.name,
      sessions: rows.length,
      onboardingCompletion: mean(rows.map(row => row.onboarding.completed ? 1 : 0)),
      avgOnboardingPlacements: mean(rows.map(row => row.onboarding.placements)),
      missionCompletion: mean(rows.map(row => row.mission.completed ? 1 : 0)),
      avgMissionPlacements: mean(rows.map(row => row.mission.placements)),
      avgInvalidActions: mean(rows.map(row => row.mission.invalidActions + row.rain.invalidActions)),
      avgMaxChain: mean(rows.map(row => row.mission.maxChain)),
      avgRainScore: mean(rows.map(row => row.rain.score)),
      avgRainLines: mean(rows.map(row => row.rain.lines)),
    };
  });
  const cities = CITIES.map((city, index) => {
    const rows = results.filter(result => result.mission.cityIndex === index);
    return {
      index, city: city.name, samples: rows.length,
      completion: mean(rows.map(row => row.mission.completed ? 1 : 0)),
      avgPlacements: mean(rows.map(row => row.mission.placements)),
      avgScore: mean(rows.map(row => row.mission.score)),
    };
  });
  return {
    appVersion: APP_VERSION,
    seed,
    sessionsPerProfile,
    totalSessions: results.length,
    generatedAt: new Date().toISOString(),
    overall: {
      onboardingCompletion: mean(results.map(row => row.onboarding.completed ? 1 : 0)),
      avgOnboardingPlacements: mean(results.map(row => row.onboarding.placements)),
      missionCompletion: mean(results.map(row => row.mission.completed ? 1 : 0)),
      avgRainScore: mean(results.map(row => row.rain.score)),
      avgInvalidActions: mean(results.map(row => row.mission.invalidActions + row.rain.invalidActions)),
    },
    profiles,
    cities,
    raw: results,
  };
}

function reportFindings(summary) {
  const hardest = [...summary.cities].filter(city => city.samples).sort((a, b) => a.completion - b.completion)[0];
  const easiest = [...summary.cities].filter(city => city.samples).sort((a, b) => b.completion - a.completion)[0];
  const weakest = [...summary.profiles].sort((a, b) => a.missionCompletion - b.missionCompletion)[0];
  const strongestRain = [...summary.profiles].sort((a, b) => b.avgRainScore - a.avgRainScore)[0];
  const criticalCities = summary.cities.filter(city => city.samples && city.completion < 0.60);
  return [
    `- Conclusao da primeira missao: ${percent(summary.overall.onboardingCompletion)}.`,
    `- Media para concluir Fortaleza: ${summary.overall.avgOnboardingPlacements.toFixed(1)} jogadas.`,
    `- Conclusao das missoes distribuidas: ${percent(summary.overall.missionCompletion)}.`,
    `- Cidade mais exigente na amostra: ${hardest?.city || 'n/a'} (${percent(hardest?.completion || 0)}).`,
    `- Cidade mais acessivel na amostra: ${easiest?.city || 'n/a'} (${percent(easiest?.completion || 0)}).`,
    `- Perfil com menor conclusao: ${weakest.name} (${percent(weakest.missionCompletion)}).`,
    `- Melhor desempenho na Chuva BR: ${strongestRain.name} (${Math.round(strongestRain.avgRainScore)} pts em media).`,
    criticalCities.length
      ? `- Atencao de balanceamento: ${criticalCities.map(city => `${city.city} (${percent(city.completion)})`).join(', ')}.`
      : '- Nenhuma cidade ficou abaixo de 60% de conclusao.',
  ];
}

function markdownReport(summary) {
  const lines = [
    '# Relatorio de Jogadores Simulados',
    '',
    `Versao: ${summary.appVersion}`,
    `Seed: ${summary.seed}`,
    `Sessoes: ${summary.totalSessions} (${summary.sessionsPerProfile} por perfil)`,
    '',
    '> Este laboratorio mede regras, equilibrio e comportamento provavel. Ele nao mede diversao ou emocao humana.',
    '',
    '## Resumo',
    '',
    ...reportFindings(summary),
    '',
    '## Perfis',
    '',
    '| Perfil | Primeira missao | Jogadas inicio | Missoes | Jogadas/missao | Acoes invalidas | Cadeia maxima | Chuva BR | Linhas Chuva |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...summary.profiles.map(profile => `| ${profile.name} | ${percent(profile.onboardingCompletion)} | ${profile.avgOnboardingPlacements.toFixed(1)} | ${percent(profile.missionCompletion)} | ${profile.avgMissionPlacements.toFixed(1)} | ${profile.avgInvalidActions.toFixed(1)} | ${profile.avgMaxChain.toFixed(1)} | ${Math.round(profile.avgRainScore)} | ${profile.avgRainLines.toFixed(1)} |`),
    '',
    '## Cidades',
    '',
    '| Cidade | Amostras | Conclusao | Jogadas | Pontos |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...summary.cities.map(city => `| ${city.city} | ${city.samples} | ${percent(city.completion)} | ${city.avgPlacements.toFixed(1)} | ${Math.round(city.avgScore)} |`),
    '',
    '## Interpretacao',
    '',
    '- Taxas muito altas em todos os perfis podem indicar missoes sem tensao.',
    '- Taxas muito baixas para Novato e Impaciente indicam atrito na entrada.',
    '- Diferenca entre perfis e desejavel: habilidade deve melhorar o resultado.',
    '- Resultados de Chuva BR devem variar com velocidade e estrategia.',
    '- As conclusoes finais precisam ser confirmadas com pessoas reais.',
    '',
  ];
  return lines.join('\n');
}

function parseNumberArg(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} precisa ser um numero positivo.`);
  return Math.floor(value);
}

function parseTextArg(name, fallback = '') {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

const sessionsPerProfile = parseNumberArg('--sessions', 10);
const baseSeed = parseTextArg('--seed', 'bloco-br-beta');
const results = [];

for (let profileIndex = 0; profileIndex < PROFILES.length; profileIndex++) {
  const profile = PROFILES[profileIndex];
  for (let session = 0; session < sessionsPerProfile; session++) {
    const sessionSeed = `${baseSeed}:${profile.id}:${session}`;
    const cityIndex = (profileIndex * sessionsPerProfile + session) % CITIES.length;
    results.push({
      profile: profile.id,
      session,
      onboarding: runMission(profile, 0, `${sessionSeed}:onboarding`, 90),
      mission: runMission(profile, cityIndex, `${sessionSeed}:mission`, 180),
      rain: runRain(profile, `${sessionSeed}:rain`),
    });
  }
}

const summary = aggregate(results, sessionsPerProfile, baseSeed);
const report = markdownReport(summary);
const reportPath = parseTextArg('--report');
const jsonPath = parseTextArg('--json');
if (reportPath) fs.writeFileSync(path.resolve(root, reportPath), report, 'utf8');
if (jsonPath) fs.writeFileSync(path.resolve(root, jsonPath), JSON.stringify(summary, null, 2), 'utf8');

console.log(`Bloco BR ${APP_VERSION}: ${summary.totalSessions} sessoes simuladas.`);
console.log(`Primeira missao: ${percent(summary.overall.onboardingCompletion)}.`);
console.log(`Missoes distribuidas: ${percent(summary.overall.missionCompletion)}.`);
console.log(`Chuva BR: ${Math.round(summary.overall.avgRainScore)} pontos em media.`);
if (reportPath) console.log(`Relatorio: ${path.resolve(root, reportPath)}`);

if (process.argv.includes('--ci')) {
  const failures = [];
  if (summary.overall.onboardingCompletion < 0.70) failures.push('primeira missao abaixo de 70%');
  if (summary.overall.avgOnboardingPlacements > 25) failures.push('primeira missao acima de 25 jogadas em media');
  if (summary.overall.missionCompletion < 0.35) failures.push('missoes distribuidas abaixo de 35%');
  if (summary.overall.avgRainScore <= 0) failures.push('Chuva BR sem pontuacao');
  if (summary.profiles.some(profile => !Number.isFinite(profile.avgMissionPlacements))) failures.push('metricas invalidas');
  if (failures.length) {
    console.error(`Falha de equilibrio: ${failures.join('; ')}.`);
    process.exitCode = 1;
  }
}
