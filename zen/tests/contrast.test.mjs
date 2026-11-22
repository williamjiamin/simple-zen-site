import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrastRatio, relativeLuminance } from '../contrast.mjs';

const combinations = [
  ['existing default body', '#eef2f0', '#0e1a17', 4.5],
  ['existing muted labels', '#9fb3ad', '#0e1a17', 4.5],
  ['existing text links', '#7fae9f', '#0e1a17', 4.5],
  ['new body', '#eef2f0', '#172b25', 4.5],
  ['new muted text', '#c0d2cb', '#172b25', 4.5],
  ['new control border', '#739988', '#172b25', 3.0],
  ['new primary button', '#0e1a17', '#a1ddc7', 4.5],
  ['new secondary button', '#eef2f0', '#172b25', 4.5],
  ['new focus outline', '#beeedd', '#172b25', 3.0],
];

test('reported colors meet text or nontext AA thresholds', () => {
  for (const [name, fg, bg, minimum] of combinations) {
    assert.ok(contrastRatio(fg, bg) >= minimum, `${name}: ${contrastRatio(fg, bg)}`);
  }
});

test('contrast math includes common reference and rejects malformed inputs', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.equal(relativeLuminance('#000000'), 0);
  assert.throws(() => contrastRatio('#fff', '#000000'), RangeError);
});

test('rendered controls have semantic names, focus and reduced-motion support', () => {
  const view = readFileSync(new URL('../view.mjs', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
  for (const token of ['aria-labelledby', 'aria-live', 'role="timer"', 'Seconds left:', 'type="button"', 'type="checkbox"', '<label', 'visibilitychange', 'pagehide']) {
    assert.ok(view.includes(token), `${token} missing`);
  }
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(view, /dataset\.zenPacer !== 'off'/);
});
