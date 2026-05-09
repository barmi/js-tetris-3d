// 우측 옵션 패널 / 상단 HUD / 중앙 오버레이 바인딩.
// pit 변경은 onPitChange 콜백으로 main.js 에 위임 (메쉬 재생성 필요).

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

export function bindUI({ game, onPitChange, onOptionsChange }) {
  // 저장된 옵션을 라디오에 반영.
  const opts = readOptions();
  for (const k of ['speed', 'level', 'pit', 'blockset']) writeRadio(k, opts[k]);
  game.applyOptions(opts);

  // 옵션 라디오 변경.
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

  // 액션 버튼.
  document.querySelector('[data-action="start"]')?.addEventListener('click', () => game.start());
  document.querySelector('[data-action="pause"]')?.addEventListener('click', () => game.pause());
  document.querySelector('[data-action="reset"]')?.addEventListener('click', () => game.reset());

  // HUD 갱신.
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
    body.textContent = '화살표 = 이동 · QWE/ASD = 회전 · Space = 드롭 · P = 일시정지';
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
