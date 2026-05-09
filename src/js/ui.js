// 우측 옵션 패널 / 상단 HUD 바인딩.
// 옵션 변경 시 onOptionsChange 콜백을 호출하고, game 이벤트로 HUD 를 갱신한다.

import { saveOption, loadOptions } from './storage.js';

export function readOptions() {
  // 저장된 값이 있으면 우선, 없으면 DOM 의 checked 라디오에서 읽는다.
  const stored = loadOptions();
  return {
    speed:    stored.speed    ?? readRadio('speed')    ?? 'medium',
    level:    stored.level    ?? readRadio('level')    ?? '0',
    pit:      stored.pit      ?? readRadio('pit')      ?? '5x5x10',
    blockset: stored.blockset ?? readRadio('blockset') ?? 'basic',
  };
}

export function bindUI({ game, onOptionsChange }) {
  // 저장된 옵션을 라디오에 반영.
  const opts = readOptions();
  for (const k of ['speed', 'level', 'pit', 'blockset']) writeRadio(k, opts[k]);
  game.applyOptions(opts);

  // 옵션 라디오 변경.
  document.querySelectorAll('.panel-group [data-option], .panel-group').forEach((g) => {
    const name = g.getAttribute('data-option');
    if (!name) return;
    g.addEventListener('change', (ev) => {
      const target = ev.target;
      if (!(target instanceof HTMLInputElement) || target.type !== 'radio') return;
      const v = target.value;
      saveOption(name, v);
      const next = { ...opts, [name]: v };
      Object.assign(opts, next);
      game.applyOptions(next);
      onOptionsChange?.(next);
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
  // high 는 storage 에서 별도 관리.
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
