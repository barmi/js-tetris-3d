// WebAudio API 기반의 가벼운 SFX. 외부 파일 없이 oscillator 로 합성.
// 첫 사용자 입력 시 unlock() 으로 AudioContext 를 깨워야 자동재생 정책 회피.

let ctx = null;
let masterGain = null;
let enabled = true;

function ensureCtx() {
  if (ctx) return ctx;
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return null;
  ctx = new C();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.15;
  masterGain.connect(ctx.destination);
  return ctx;
}

export function setEnabled(v) {
  enabled = !!v;
}

export function unlock() {
  const c = ensureCtx();
  if (c?.state === 'suspended') c.resume();
}

function blip(freq, dur, type = 'square', gain = 0.7, freqEnd = null) {
  if (!enabled) return;
  const c = ensureCtx();
  if (!c || c.state === 'suspended') return;
  const t0 = c.currentTime;
  const osc = c.createOscillator();
  const env = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(gain, t0 + 0.005);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env).connect(masterGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export const sfx = {
  move()    { blip(220, 0.04, 'square',   0.35); },
  rotate()  { blip(330, 0.06, 'triangle', 0.45); },
  drop()    { blip(440, 0.10, 'sawtooth', 0.45, 110); },
  lock()    { blip(120, 0.08, 'square',   0.55, 60); },
  clear()   {
    blip(440, 0.08, 'square', 0.5);
    setTimeout(() => blip(660, 0.08, 'square', 0.5), 70);
    setTimeout(() => blip(880, 0.12, 'square', 0.55), 140);
  },
  gameOver() {
    blip(440, 0.18, 'sawtooth', 0.7, 220);
    setTimeout(() => blip(330, 0.18, 'sawtooth', 0.65, 165), 140);
    setTimeout(() => blip(220, 0.32, 'sawtooth', 0.65, 110), 280);
  },
};
