import test from 'node:test';
import assert from 'node:assert/strict';
import { ProceduralChime, toneForPhase } from '../chime.mjs';

function fakeContext() {
  const calls = [];
  const ctx = {
    state: 'suspended', currentTime: 10, destination: {}, calls,
    async resume() { this.state = 'running'; calls.push('resume'); },
    async close() { this.state = 'closed'; calls.push('close'); },
    createOscillator() {
      const osc = {
        frequency: { setValueAtTime() { calls.push('frequency'); } },
        connect() { calls.push('osc-connect'); }, start() { calls.push('start'); },
        stop() { calls.push('stop'); }, disconnect() { calls.push('osc-disconnect'); },
      };
      return osc;
    },
    createGain() {
      return {
        gain: {
          setValueAtTime() { calls.push('gain-set'); },
          exponentialRampToValueAtTime() { calls.push('gain-ramp'); },
        },
        connect() { calls.push('gain-connect'); }, disconnect() { calls.push('gain-disconnect'); },
      };
    },
  };
  return ctx;
}

test('chime never constructs audio before explicit unlock', async () => {
  let constructs = 0;
  const chime = new ProceduralChime({ contextFactory: () => { constructs++; return fakeContext(); } });
  assert.equal(chime.play('inhale'), false);
  assert.equal(constructs, 0);
  assert.equal(await chime.unlock(), true);
  assert.equal(constructs, 1);
  await chime.dispose();
});

test('notes only play on inhale or exhale and are throttled', async () => {
  const ctx = fakeContext();
  const chime = new ProceduralChime({ contextFactory: () => ctx });
  await chime.unlock();
  assert.equal(chime.play('hold'), false);
  assert.equal(chime.play('inhale'), true);
  assert.equal(chime.play('exhale'), false);
  ctx.currentTime += 0.2;
  assert.equal(chime.play('exhale'), true);
  assert.equal(ctx.calls.filter(c => c === 'start').length, 2);
  assert.equal(ctx.calls.filter(c => c === 'gain-ramp').length, 4);
  await chime.dispose();
});

test('muting disables new sound; disposed object cannot restart', async () => {
  const ctx = fakeContext();
  const chime = new ProceduralChime({ contextFactory: () => ctx, enabled: false });
  assert.equal(await chime.unlock(), false);
  chime.enabled = true;
  await chime.unlock();
  chime.enabled = false;
  assert.equal(chime.play('inhale'), false);
  await chime.dispose();
  chime.enabled = true;
  assert.equal(await chime.unlock(), false);
});

test('tone mapping avoids held-breath prompts', () => {
  assert.equal(toneForPhase('hold'), null);
  assert.equal(toneForPhase('hold_out'), null);
  assert.equal(toneForPhase('unknown'), null);
  assert.ok(toneForPhase('inhale').frequency > toneForPhase('exhale').frequency);
});
