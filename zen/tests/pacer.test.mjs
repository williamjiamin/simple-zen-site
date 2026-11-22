import test from 'node:test';
import assert from 'node:assert/strict';
import { BREATH_PRESETS, BreathPacer, phaseAt } from '../pacer.mjs';

test('4-7-8 phase boundaries are exact in milliseconds', () => {
  for (const [ms, phase, remain] of [
    [0, 'inhale', 4000], [3999, 'inhale', 1],
    [4000, 'hold', 7000], [10999, 'hold', 1],
    [11000, 'exhale', 8000], [18999, 'exhale', 1],
    [19000, 'inhale', 4000], [38000, 'inhale', 4000],
  ]) {
    const frame = phaseAt('478', ms);
    assert.equal(frame.phase, phase);
    assert.equal(frame.phaseRemainingMs, remain);
  }
});

test('box pattern has four equal sections and exact cycle boundaries', () => {
  for (const [ms, phase] of [
    [0, 'inhale'], [4000, 'hold_in'], [8000, 'exhale'],
    [12000, 'hold_out'], [15999, 'hold_out'], [16000, 'inhale'],
  ]) assert.equal(phaseAt('box', ms).phase, phase);
  assert.equal(phaseAt('box', 16000).cycleIndex, 1);
});

test('preset phases stay immutable and lengths total the specified cycles', () => {
  assert.equal(BREATH_PRESETS['478'].reduce((n, x) => n + x.ms, 0), 19000);
  assert.equal(BREATH_PRESETS.box.reduce((n, x) => n + x.ms, 0), 16000);
  assert.ok(Object.isFrozen(BREATH_PRESETS.box));
});

test('phase progress is bounded and reaches almost one before transition', () => {
  const nearEnd = phaseAt('478', 3999);
  assert.ok(nearEnd.phaseProgress < 1 && nearEnd.phaseProgress > 0.999);
  assert.equal(phaseAt('478', 4000).phaseProgress, 0);
});

test('invalid preset, time, and callbacks are rejected', () => {
  for (const ms of [-1, NaN, Infinity, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => phaseAt('478', ms), RangeError);
  }
  assert.throws(() => phaseAt('unlisted', 0), RangeError);
  assert.throws(() => phaseAt('constructor', 0), RangeError);
  assert.throws(() => new BreathPacer({ preset: 'toString' }), RangeError);
  assert.throws(() => new BreathPacer({ preset: 'unlisted' }), RangeError);
  assert.throws(() => new BreathPacer({ clock: null }), TypeError);
});

test('pause and resume do not count paused time', () => {
  let now = 100;
  const pacer = new BreathPacer({ clock: () => now });
  pacer.start(); now = 3100;
  assert.equal(pacer.elapsedMs, 3000);
  pacer.pause(); now = 100000;
  assert.equal(pacer.elapsedMs, 3000);
  pacer.start(); now += 1001;
  assert.equal(pacer.elapsedMs, 4001);
  assert.equal(pacer.snapshot().phase, 'hold');
});

test('start and pause are idempotent; reset stops and changes preset', () => {
  let now = 0;
  const pacer = new BreathPacer({ clock: () => now });
  assert.equal(pacer.pause(), false);
  assert.equal(pacer.start(), true);
  assert.equal(pacer.start(), false);
  now = 5000;
  assert.equal(pacer.pause(), true);
  assert.equal(pacer.pause(), false);
  pacer.reset('box');
  assert.equal(pacer.running, false);
  assert.equal(pacer.preset, 'box');
  assert.equal(pacer.elapsedMs, 0);
});

test('phase-change events fire once, including after large clock jumps', () => {
  let now = 0;
  const events = [];
  const pacer = new BreathPacer({ clock: () => now, onTransition: f => events.push(f.phase) });
  pacer.start(); pacer.tick(); pacer.tick();
  now = 4000; pacer.tick(); pacer.tick();
  now = 19000 * 500 + 11000; pacer.tick();
  assert.deepEqual(events, ['inhale', 'hold', 'exhale']);
});

test('monotonic clock reversal cannot move elapsed time below zero', () => {
  let now = 100;
  const pacer = new BreathPacer({ clock: () => now });
  pacer.start(); now = 80;
  assert.equal(pacer.elapsedMs, 0);
});
