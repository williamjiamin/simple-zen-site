import { BreathPacer } from './pacer.mjs';
import { ProceduralChime } from './chime.mjs';

// The owner can opt out without modifying the existing page or its layout.
if (document.documentElement.dataset.zenPacer !== 'off') {
  const anchor = document.querySelector('.features');
  if (anchor) {
    const section = document.createElement('section');
    section.className = 'zen-pacer';
    section.setAttribute('aria-labelledby', 'zen-heading');
    section.innerHTML = `
      <h2 id="zen-heading">A moment to breathe</h2>
      <p class="zen-help" id="zen-instructions">Follow the gentle pace at your own comfort. Stop at any time.</p>
      <div class="zen-ring" aria-hidden="true"><div class="zen-ring-inner"></div></div>
      <p class="zen-phase" id="zen-phase" aria-live="polite" aria-atomic="true">Ready</p>
      <p class="zen-countdown" role="timer" aria-live="off"><span class="zen-countdown-desc">Seconds left: </span><span id="zen-seconds">4</span></p>
      <div class="zen-controls">
        <label for="zen-preset">Breathing pattern</label>
        <select id="zen-preset" aria-describedby="zen-instructions">
          <option value="478">4–7–8 breathing</option>
          <option value="box">Box breathing (4 each)</option>
        </select>
        <div class="zen-actions">
          <button id="zen-toggle" type="button" aria-pressed="false">Start</button>
          <button id="zen-reset" type="button">Reset</button>
        </div>
        <label class="zen-chime-toggle" for="zen-chime">
          <input id="zen-chime" type="checkbox" checked /> Gentle phase chimes
        </label>
      </div>
      <p class="zen-note" id="zen-note">Audio begins only after you press Start. No microphone or network is used.</p>`;
    anchor.insertAdjacentElement('afterend', section);

    const phaseEl = section.querySelector('#zen-phase');
    const countdownEl = section.querySelector('#zen-seconds');
    const ringEl = section.querySelector('.zen-ring-inner');
    const toggleEl = section.querySelector('#zen-toggle');
    const resetEl = section.querySelector('#zen-reset');
    const presetEl = section.querySelector('#zen-preset');
    const chimeEl = section.querySelector('#zen-chime');
    const noteEl = section.querySelector('#zen-note');
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const chime = new ProceduralChime();
    const labels = Object.freeze({ inhale: 'Breathe in', exhale: 'Breathe out', hold: 'Hold gently', hold_in: 'Hold gently', hold_out: 'Pause gently' });
    const pacer = new BreathPacer({ onTransition(frame) {
      phaseEl.textContent = labels[frame.phase];
      try { chime.play(frame.phase); } catch { noteEl.textContent = 'Audio unavailable; the visual pacer remains active.'; }
    } });
    let raf = 0;
    let lastSeconds = -1;
    let lastPhase = '';

    function render(frame) {
      const seconds = Math.ceil(frame.phaseRemainingMs / 1000);
      if (seconds !== lastSeconds) {
        countdownEl.textContent = String(seconds);
        lastSeconds = seconds;
      }
      if (frame.phase !== lastPhase) {
        if (!pacer.running) phaseEl.textContent = frame.elapsedMs === 0 ? 'Ready' : labels[frame.phase];
        lastPhase = frame.phase;
      }
      const progress = frame.phaseProgress;
      let scale = 0.68;
      if (frame.phase === 'inhale') scale += progress * 0.32;
      else if (frame.phase === 'hold' || frame.phase === 'hold_in') scale = 1;
      else if (frame.phase === 'exhale') scale = 1 - progress * 0.32;
      ringEl.style.transform = reduceMotion.matches ? 'none' : `scale(${scale.toFixed(4)})`;
    }

    function updateButton() {
      toggleEl.textContent = pacer.running ? 'Pause' : (pacer.elapsedMs === 0 ? 'Start' : 'Resume');
      toggleEl.setAttribute('aria-pressed', String(pacer.running));
    }

    function loop() {
      if (!pacer.running) return;
      render(pacer.tick());
      raf = requestAnimationFrame(loop);
    }

    function pause() {
      if (!pacer.pause()) return;
      cancelAnimationFrame(raf);
      updateButton();
      noteEl.textContent = 'Paused. Resume when you are ready.';
    }

    toggleEl.addEventListener('click', () => {
      if (pacer.running) { pause(); return; }
      chime.enabled = chimeEl.checked;
      if (chime.enabled) {
        void chime.unlock().then(ok => {
          if (!ok && pacer.running) noteEl.textContent = 'Audio unavailable; the visual pacer remains active.';
        }).catch(() => {
          if (pacer.running) noteEl.textContent = 'Audio unavailable; the visual pacer remains active.';
        });
      }
      pacer.start();
      updateButton();
      noteEl.textContent = 'Breathing pace active. Press Pause whenever needed.';
      loop();
    });

    resetEl.addEventListener('click', () => {
      cancelAnimationFrame(raf);
      pacer.reset(presetEl.value);
      lastSeconds = -1;
      lastPhase = '';
      render(pacer.snapshot());
      phaseEl.textContent = 'Ready';
      noteEl.textContent = 'Ready to begin.';
      updateButton();
    });
    presetEl.addEventListener('change', () => resetEl.click());
    chimeEl.addEventListener('change', () => { chime.enabled = chimeEl.checked; });
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
    window.addEventListener('pagehide', (event) => { pause(); if (!event.persisted) void chime.dispose(); });
    render(pacer.snapshot());
  }
}
