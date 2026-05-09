// 우측 옵션 패널 / 상단 HUD / 중앙 오버레이 / View 프리셋 버튼 + Theme/Palette/Sound 옵션.

import { saveOption, loadOptions, loadHighScore, loadStats } from './storage.js';

const VALID_THEMES = ['dark', 'light', 'neon', 'minimal'];

export function readOptions() {
  const stored = loadOptions();
  return {
    speed:    stored.speed    ?? readRadio('speed')    ?? 'medium',
    level:    stored.level    ?? readRadio('level')    ?? '0',
    pit:      stored.pit      ?? readRadio('pit')      ?? '5x5x10',
    blockset: stored.blockset ?? readRadio('blockset') ?? 'basic',
    theme:    stored.theme    ?? readRadio('theme')    ?? 'dark',
    palette:  stored.palette  ?? readRadio('palette')  ?? 'standard',
    sound:    stored.sound    ?? readRadio('sound')    ?? 'on',
  };
}

export function bindUI({ game, onPitChange, onOptionsChange, onView, onTheme, onPalette, onSound }) {
  const opts = readOptions();
  for (const k of Object.keys(opts)) writeRadio(k, opts[k]);

  // 게임 자체 옵션은 한꺼번에 적용 (theme/palette/sound 는 무시됨).
  game.applyOptions(opts);

  // 시각 옵션 초기 적용.
  applyTheme(opts.theme);
  onTheme?.(opts.theme);
  onPalette?.(opts.palette);
  onSound?.(opts.sound);

  document.querySelectorAll('.panel-group[data-option]').forEach((g) => {
    const name = g.getAttribute('data-option');
    g.addEventListener('change', (ev) => {
      const t = ev.target;
      if (!(t instanceof HTMLInputElement) || t.type !== 'radio') return;
      saveOption(name, t.value);
      opts[name] = t.value;
      switch (name) {
        case 'pit':     onPitChange?.(t.value); break;
        case 'theme':   applyTheme(t.value); onTheme?.(t.value); break;
        case 'palette': onPalette?.(t.value); break;
        case 'sound':   onSound?.(t.value); break;
        default:        game.applyOptions({ [name]: t.value });
      }
      onOptionsChange?.({ ...opts });
    });
  });

  document.querySelector('[data-action="start"]')?.addEventListener('click', () => game.start());
  document.querySelector('[data-action="pause"]')?.addEventListener('click', () => game.pause());
  document.querySelector('[data-action="reset"]')?.addEventListener('click', () => game.reset());

  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => onView?.(btn.getAttribute('data-view')));
  });

  game.on(() => updateHud(game));
  updateHud(game);
}

function applyTheme(theme) {
  const t = VALID_THEMES.includes(theme) ? theme : 'dark';
  document.documentElement.dataset.theme = t;
}

function updateHud(game) {
  setHud('cubes', game.cubes);
  setHud('score', game.score);
  setHud('level', game.level);
  setHud('high', loadHighScore());

  const overlay = document.querySelector('[data-overlay]');
  const title = document.querySelector('[data-overlay-title]');
  const body = document.querySelector('[data-overlay-body]');
  if (!overlay || !title || !body) return;

  if (game.state === 'running') {
    overlay.hidden = true;
    return;
  }
  overlay.hidden = false;
  if (game.state === 'idle') {
    title.textContent = 'Press B to start';
    body.textContent = '화살표 = 이동(카메라 기준) · QWE/ASD = 회전 · Space = 드롭 · 1/2/3/4 = 시점 · P = 일시정지';
  } else if (game.state === 'paused') {
    title.textContent = 'Paused';
    body.textContent = 'P 키로 재개';
  } else if (game.state === 'gameover') {
    const s = loadStats();
    title.textContent = 'Game Over';
    body.innerHTML =
      `<strong>Score ${game.score}</strong> · Cubes ${game.cubes} · Lines ${game.layers}<br>` +
      `Best score ${s.bestScore} · Best combo ${s.bestCombo}<br>` +
      `<small>${s.games} games · ${s.totalCubes} cubes · ${s.totalLines} lines (누적)</small><br>` +
      `B 키로 다시 시작`;
  }
}

function setHud(key, value) {
  const el = document.querySelector(`[data-hud="${key}"]`);
  if (el) el.textContent = String(value);
}

function readRadio(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el?.value;
}

function writeRadio(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) el.checked = true;
}
