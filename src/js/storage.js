// localStorage 래퍼. 키 prefix 로 다른 앱과 충돌을 피한다.

const PREFIX = 'js-tetris-3d:';
const HIGH_KEY  = PREFIX + 'highScore';
const OPTS_KEY  = PREFIX + 'options';
const VIEW_KEY  = PREFIX + 'cameraView';
const STATS_KEY = PREFIX + 'stats';

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

export function loadCameraView() {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCameraView(view) {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view));
  } catch { /* quota 등 무시 */ }
}

const DEFAULT_STATS = { games: 0, totalCubes: 0, totalLines: 0, bestScore: 0, bestCombo: 0 };

export function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? { ...DEFAULT_STATS, ...JSON.parse(raw) } : { ...DEFAULT_STATS };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch { /* quota 등 무시 */ }
}
