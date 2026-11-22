// Original in-memory tone synthesis. No audio assets, requests, or background play.
export function toneForPhase(phase) {
  if (phase === 'inhale') return Object.freeze({ frequency: 440, duration: 0.24 });
  if (phase === 'exhale') return Object.freeze({ frequency: 349.23, duration: 0.30 });
  return null;
}

function defaultContextFactory() {
  const Ctor = globalThis.AudioContext || globalThis.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

export class ProceduralChime {
  #context = null;
  #factory;
  #enabled;
  #closed = false;
  #lastStart = -Infinity;

  constructor({ contextFactory = defaultContextFactory, enabled = true } = {}) {
    this.#factory = contextFactory;
    this.#enabled = Boolean(enabled);
  }

  get enabled() { return this.#enabled; }
  set enabled(value) { this.#enabled = Boolean(value); }
  get supported() { return this.#context !== null; }

  async unlock() {
    if (this.#closed || !this.#enabled) return false;
    if (this.#context === null) this.#context = this.#factory();
    if (this.#context === null) return false;
    if (this.#context.state === 'suspended') await this.#context.resume();
    return this.#context.state === 'running';
  }

  play(phase) {
    const tone = toneForPhase(phase);
    if (!this.#enabled || this.#closed || tone === null ||
        this.#context === null || this.#context.state !== 'running') return false;
    const now = this.#context.currentTime;
    if (now - this.#lastStart < 0.12) return false;
    this.#lastStart = now;
    const oscillator = this.#context.createOscillator();
    const gain = this.#context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(tone.frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.025, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.duration);
    oscillator.connect(gain);
    gain.connect(this.#context.destination);
    oscillator.start(now);
    oscillator.stop(now + tone.duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    return true;
  }

  async dispose() {
    this.#closed = true;
    if (this.#context && this.#context.state !== 'closed') await this.#context.close();
    this.#context = null;
  }
}
