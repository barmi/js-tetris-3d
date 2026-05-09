// 우측 옵션 패널 / 상단 HUD / 중앙 오버레이 + View 프리셋 버튼 바인딩.

import { saveOption, loadOptions, loadHighScore } from './storage.js';

export function readOptions() {
  const stored = loadOptions();
  return {
    speed:    stored.speed    ?? readRadio('speed')    ?? 'medium',
    level:    stored.level    ?? readRadio('level')    ?? '0',
    pit:      stored.pit      ?? readRadio('pit')      ?? '5x5x10',
    blockset: stored.blockset ?? readRadio('blockset') ?? 'basic',
  };
}

export function bindUI({ game, onPitChange, onOptionsChange, onView }) {
  const opts = readOptions();
  for (const k of ['speed', 'level', 'pit', 'blockset']) writeRadio(k, opts[k]);
  game.applyOptions(opts);

  document.querySelectorAll('.panel-group[data-option]').forEach((g) => {
    const name = g.getAttribute('data-option');
    g.addEventListener('change', (ev) => {
      const t = ev.target;
      if (!(t instanceof HTMLInputElement) || t.type !== 'radio') return;
      saveOption(name, t.value);
      opts[name] = t.value;
      if (name === 'pit') {
        onPitChange?.(t.value);
      } else {
        game.applyOptions({ [name]: t.value });
      }
      onOptionsChange?.({ ...opts });
    });
  });

  document.querySelector('[data-action="start"]')?.addEventListener('click', () => game.start());
  document.querySelector('[data-action="pause"]')?.addEventListener('click', () => game.pause());
  document.querySelector('[data-action="reset"]')?.addEventListener('click', () => game.reset());

  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-view');
      onView?.(preset);
    });
  });

  game.on(() => updateHud(game));
  updateHud(game);
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
    title.textContent = 'Game Over';
    body.textContent = `Score ${game.score} · Cubes ${game.cubes} · B 키로 다시 시작`;
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
