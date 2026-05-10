// 우측 옵션 패널 / 상단 HUD / 중앙 오버레이 + View 프리셋 + Theme/Palette/Sound/RotateAnim 옵션.

import { saveOption, loadOptions, loadHighScore, loadStats } from './storage.js';

const VALID_THEMES = ['dark', 'light', 'neon', 'minimal'];

export function readOptions() {
  const stored = loadOptions();
  return {
    speed:       stored.speed       ?? readSelect('speed')       ?? 'medium',
    level:       stored.level       ?? readSelect('level')       ?? '0',
    pit:         stored.pit         ?? readSelect('pit')         ?? '5x5x10',
    blockset:    stored.blockset    ?? readSelect('blockset')    ?? 'basic',
    theme:       stored.theme       ?? readSelect('theme')       ?? 'dark',
    palette:     stored.palette     ?? (readCheck('palette')    ? 'colorblind' : 'standard'),
    sound:       stored.sound       ?? (readCheck('sound')      ? 'on' : 'off'),
    rotateAnim:  stored.rotateAnim  ?? (readCheck('rotateAnim') ? 'on' : 'off'),
  };
}

export function bindUI({
  game, onPitChange, onOptionsChange, onView,
  onTheme, onPalette, onSound, onRotateAnim,
  onAuto, onAutoSpeed,
}) {
  const opts = readOptions();

  for (const k of ['speed', 'level', 'pit', 'blockset', 'theme']) writeSelect(k, opts[k]);
  writeCheck('palette',    opts.palette    === 'colorblind');
  writeCheck('sound',      opts.sound      === 'on');
  writeCheck('rotateAnim', opts.rotateAnim === 'on');

  game.applyOptions(opts);
  applyTheme(opts.theme);
  onTheme?.(opts.theme);
  onPalette?.(opts.palette);
  onSound?.(opts.sound);
  onRotateAnim?.(opts.rotateAnim);

  document.querySelectorAll('select[data-option]').forEach((sel) => {
    const name = sel.getAttribute('data-option');
    sel.addEventListener('change', () => {
      const v = sel.value;
      saveOption(name, v);
      opts[name] = v;
      switch (name) {
        case 'pit':   onPitChange?.(v); break;
        case 'theme': applyTheme(v); onTheme?.(v); break;
        default:      game.applyOptions({ [name]: v });
      }
      onOptionsChange?.({ ...opts });
    });
  });

  document.querySelectorAll('input[data-option-check]').forEach((cb) => {
    const name = cb.getAttribute('data-option-check');
    const onValue  = cb.getAttribute('data-on-value')  ?? 'on';
    const offValue = cb.getAttribute('data-off-value') ?? 'off';
    cb.addEventListener('change', () => {
      const v = cb.checked ? onValue : offValue;
      saveOption(name, v);
      opts[name] = v;
      switch (name) {
        case 'palette':    onPalette?.(v); break;
        case 'sound':      onSound?.(v);   break;
        case 'rotateAnim': onRotateAnim?.(v); break;
      }
      onOptionsChange?.({ ...opts });
    });
  });

  document.querySelector('[data-action="start"]')?.addEventListener('click', () => game.start());
  document.querySelector('[data-action="pause"]')?.addEventListener('click', () => game.pause());
  document.querySelector('[data-action="reset"]')?.addEventListener('click', () => game.reset());
  document.querySelector('[data-action="auto"]')?.addEventListener('click', () => onAuto?.());

  // AP 슬라이더 — 활성 시에만 보이지만 핸들러는 항상 등록.
  const apSpeedEl = document.querySelector('[data-ap-speed]');
  const apSpeedDisplayEl = document.querySelector('[data-ap-speed-display]');
  if (apSpeedEl) {
    const updateApDisplay = () => {
      if (apSpeedDisplayEl) apSpeedDisplayEl.textContent = `${apSpeedEl.value} ms`;
    };
    apSpeedEl.addEventListener('input', () => {
      onAutoSpeed?.(+apSpeedEl.value);
      updateApDisplay();
    });
    updateApDisplay();
    onAutoSpeed?.(+apSpeedEl.value);
  }

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
    body.textContent = '화살표 = 이동 · QWE/ASD = 회전 · Space = 드롭 · 1/2/3/4 = 시점 · P = 일시정지';
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

function readSelect(name) {
  const el = document.querySelector(`select[data-option="${name}"]`);
  return el?.value;
}
function writeSelect(name, value) {
  const el = document.querySelector(`select[data-option="${name}"]`);
  if (el) el.value = value;
}
function readCheck(name) {
  const el = document.querySelector(`input[data-option-check="${name}"]`);
  return el?.checked;
}
function writeCheck(name, checked) {
  const el = document.querySelector(`input[data-option-check="${name}"]`);
  if (el) el.checked = !!checked;
}
