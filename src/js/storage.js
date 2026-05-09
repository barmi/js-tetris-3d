// localStorage 래퍼. 키 prefix 로 다른 앱과 충돌을 피한다.

const PREFIX = 'js-tetris-3d:';
const HIGH_KEY = PREFIX + 'highScore';
const OPTS_KEY = PREFIX + 'options';

export function loadHighScore() {
  const v = localStorage.getItem(HIGH_KEY);
  return v ? parseInt(v, 10) || 0 : 0;
}

export function saveHighScore(score) {
  if (score > loadHighScore()) localStorage.setItem(HIGH_KEY, String(score));
}

export function loadOptions() {
  try {
    const raw = localStorage.getItem(OPTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveOption(key, value) {
  const opts = loadOptions();
  opts[key] = value;
  localStorage.setItem(OPTS_KEY, JSON.stringify(opts));
}
