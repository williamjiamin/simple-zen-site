# Procedural breathing pacer

This folder adds an offline, dependency-free breathing widget to the existing static page. The implementation uses a monotonic clock, exact millisecond boundaries, and a phase-change callback that never queues catch-up chimes. The optional chime uses low-gain oscillator envelopes created only after an explicit Start action; the visual timer still runs without audio support.

Presets: `478` is inhale 4 seconds, hold 7 seconds, exhale 8 seconds. `box` is inhale, hold, exhale, hold, each 4 seconds. Reset, Resume and tab-background Pause preserve deterministic clock behavior. `document.documentElement.dataset.zenPacer = "off"` before module execution disables the entire enhancement without inserting a node or affecting existing styles. The widget is enabled by default.

Run the tests from the site root:

```sh
node --test zen/tests/*.test.mjs
```

A contrast and accessibility review, including unverified manual checks, is in `A11Y_AUDIT.md`. No external assets, packages, network calls, account identifiers, or persistent state are needed.
