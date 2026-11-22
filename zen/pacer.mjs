// Original deterministic breath-phase clock. No timers or audio are created here.
const PRESET_478 = Object.freeze([
  Object.freeze({ id: 'inhale', ms: 4000 }),
  Object.freeze({ id: 'hold', ms: 7000 }),
  Object.freeze({ id: 'exhale', ms: 8000 }),
]);
const PRESET_BOX = Object.freeze([
  Object.freeze({ id: 'inhale', ms: 4000 }),
  Object.freeze({ id: 'hold_in', ms: 4000 }),
  Object.freeze({ id: 'exhale', ms: 4000 }),
  Object.freeze({ id: 'hold_out', ms: 4000 }),
]);

export const BREATH_PRESETS = Object.freeze({ '478': PRESET_478, box: PRESET_BOX });

export function phaseAt(presetName, elapsedMs) {
  const phases = Object.hasOwn(BREATH_PRESETS, presetName) ? BREATH_PRESETS[presetName] : null;
  if (!phases) throw new RangeError('Unknown breathing preset');
  if (!Number.isFinite(elapsedMs) || !Number.isSafeInteger(elapsedMs) || elapsedMs < 0) {
    throw new RangeError('Elapsed time must be a non-negative safe integer of milliseconds');
  }
  const cycleMs = phases.reduce((sum, phase) => sum + phase.ms, 0);
  const cycleIndex = Math.floor(elapsedMs / cycleMs);
  const cycleElapsedMs = elapsedMs % cycleMs;
  let startMs = 0;
  for (let index = 0; index < phases.length; index += 1) {
    const phase = phases[index];
    const endMs = startMs + phase.ms;
    if (cycleElapsedMs < endMs) {
      const phaseElapsedMs = cycleElapsedMs - startMs;
      return {
        preset: presetName,
        phase: phase.id,
        phaseIndex: index,
        cycleIndex,
        phaseElapsedMs,
        phaseRemainingMs: phase.ms - phaseElapsedMs,
        phaseProgress: phaseElapsedMs / phase.ms,
        elapsedMs,
        cycleMs,
      };
    }
    startMs = endMs;
  }
  throw new Error('Invalid phase schedule');
}

export class BreathPacer {
  #clock;
  #onTransition;
  #preset;
  #offsetMs = 0;
  #startedAt = 0;
  #running = false;
  #lastPhaseKey = null;

  constructor({ preset = '478', clock = () => performance.now(), onTransition = () => {} } = {}) {
    if (!Object.hasOwn(BREATH_PRESETS, preset)) throw new RangeError('Unknown breathing preset');
    if (typeof clock !== 'function' || typeof onTransition !== 'function') {
      throw new TypeError('Clock and transition handler must be functions');
    }
    this.#preset = preset;
    this.#clock = clock;
    this.#onTransition = onTransition;
  }

  get running() { return this.#running; }
  get preset() { return this.#preset; }

  #now() {
    const value = this.#clock();
    if (!Number.isFinite(value)) throw new RangeError('Invalid monotonic clock');
    return value;
  }

  get elapsedMs() {
    if (!this.#running) return this.#offsetMs;
    const elapsed = Math.max(0, this.#now() - this.#startedAt);
    return Math.min(Number.MAX_SAFE_INTEGER, this.#offsetMs + Math.floor(elapsed));
  }

  snapshot() { return phaseAt(this.#preset, this.elapsedMs); }

  start() {
    if (this.#running) return false;
    this.#startedAt = this.#now();
    this.#running = true;
    return true;
  }

  pause() {
    if (!this.#running) return false;
    this.#offsetMs = this.elapsedMs;
    this.#running = false;
    return true;
  }

  reset(preset = this.#preset) {
    if (!Object.hasOwn(BREATH_PRESETS, preset)) throw new RangeError('Unknown breathing preset');
    this.#preset = preset;
    this.#offsetMs = 0;
    this.#running = false;
    this.#lastPhaseKey = null;
    return this.snapshot();
  }

  tick() {
    const frame = this.snapshot();
    if (this.#running) {
      const key = `${frame.cycleIndex}:${frame.phaseIndex}`;
      if (key !== this.#lastPhaseKey) {
        this.#lastPhaseKey = key;
        // At most one phase event per sample, even after a large time jump.
        this.#onTransition(frame);
      }
    }
    return frame;
  }
}
