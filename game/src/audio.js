// Sound: everything is synthesised with WebAudio — no audio files.
// Engine hum, two-tone siren, gunshots, radio jingles and UI blips.
import { RADIO_STATIONS } from './config.js';

export function createAudio() {
  return {
    ctx: null, enabled: false, station: 0, radioOn: true,
    engineOsc: null, engineGain: null, sirenOsc: null, sirenGain: null,
    radioTimer: 0, radioStep: 0,
  };
}

function ensureCtx(audio) {
  if (audio.ctx) return audio.ctx;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    audio.ctx = new Ctx();
    return audio.ctx;
  } catch {
    return null;
  }
}

export function startAudio(audio) {
  const ctx = ensureCtx(audio);
  if (!ctx) return;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  audio.enabled = true;
  // Engine: a low sawtooth whose pitch follows speed.
  audio.engineOsc = ctx.createOscillator();
  audio.engineOsc.type = 'sawtooth';
  audio.engineOsc.frequency.value = 55;
  audio.engineGain = ctx.createGain();
  audio.engineGain.gain.value = 0.0;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 420;
  audio.engineOsc.connect(filter);
  filter.connect(audio.engineGain);
  audio.engineGain.connect(ctx.destination);
  audio.engineOsc.start();
  // Siren: two alternating tones, quiet until wanted.
  audio.sirenOsc = ctx.createOscillator();
  audio.sirenOsc.type = 'triangle';
  audio.sirenOsc.frequency.value = 700;
  audio.sirenGain = ctx.createGain();
  audio.sirenGain.gain.value = 0.0;
  audio.sirenOsc.connect(audio.sirenGain);
  audio.sirenGain.connect(ctx.destination);
  audio.sirenOsc.start();
}

export function updateAudio(audio, dt, speed, wanted) {
  if (!audio.enabled || !audio.ctx) return;
  const t = audio.ctx.currentTime;
  if (audio.engineGain) {
    audio.engineGain.gain.setTargetAtTime(Math.min(0.05, Math.abs(speed) / 9000), t, 0.1);
    if (audio.engineOsc) audio.engineOsc.frequency.setTargetAtTime(55 + Math.abs(speed) * 0.35, t, 0.1);
  }
  if (audio.sirenGain && audio.sirenOsc) {
    const on = wanted > 0;
    audio.sirenGain.gain.setTargetAtTime(on ? 0.028 : 0.0, t, 0.2);
    if (on) audio.sirenOsc.frequency.setTargetAtTime(650 + 250 * Math.sin(t * 3.2), t, 0.05);
  }
  // Radio: a tiny sequenced loop per station, a note every 0.22 s.
  if (audio.radioOn) {
    audio.radioTimer -= dt;
    if (audio.radioTimer <= 0) {
      audio.radioTimer = 0.22;
      playRadioNote(audio);
    }
  }
}

const SCALES = [
  [220, 277, 330, 415, 494, 554], // Vice FM: bright minor
  [110, 165, 220, 247, 330, 392], // Coral Rock: power chords
  [174, 220, 261, 311, 349, 415], // Wave: dreamy synth
];

function playRadioNote(audio) {
  const ctx = audio.ctx;
  if (!ctx) return;
  const scale = SCALES[audio.station % SCALES.length];
  const note = scale[audio.radioStep % scale.length];
  audio.radioStep += 1;
  const osc = ctx.createOscillator();
  osc.type = audio.station === 1 ? 'square' : 'sine';
  osc.frequency.value = note * (audio.station === 2 ? 2 : 1);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.035, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.22);
}

export function playShot(audio) {
  const ctx = ensureCtx(audio);
  if (!ctx || !audio.enabled) return;
  const len = ctx.sampleRate * 0.08;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = 0.16;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

export function playBlip(audio, freq = 880) {
  const ctx = ensureCtx(audio);
  if (!ctx || !audio.enabled) return;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.13);
}

export function cycleStation(audio) {
  audio.station = (audio.station + 1) % RADIO_STATIONS.length;
  audio.radioStep = 0;
  playBlip(audio, 660);
}
