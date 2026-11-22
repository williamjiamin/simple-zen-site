# Breathing pacer accessibility and contrast audit

Automated checks use the sRGB relative-luminance algorithm and compare opaque foreground/background pairs. Text must reach 4.5:1, and the intentional boundary and focus indication must reach 3:1. Approximate ratios from the supplied palette:

| Usage | Foreground | Background | Ratio | Threshold |
| --- | --- | --- | ---: | ---: |
| Existing page body | `#eef2f0` | `#0e1a17` | 15.77 | 4.5 |
| Existing page muted copy | `#9fb3ad` | `#0e1a17` | 8.08 | 4.5 |
| Existing page links | `#7fae9f` | `#0e1a17` | 7.17 | 4.5 |
| New panel body | `#eef2f0` | `#172b25` | 13.20 | 4.5 |
| New panel muted copy | `#c0d2cb` | `#172b25` | 9.46 | 4.5 |
| New panel border | `#739988` | `#172b25` | 4.71 | 3.0 |
| Main button text | `#0e1a17` | `#a1ddc7` | 11.61 | 4.5 |
| New focus indicator | `#beeedd` | `#172b25` | > 3.0 | 3.0 |

## Static checks implemented

- Native labelled select, buttons and checkbox; obvious Start, Pause, Resume and Reset controls.
- Visible keyboard focus; 44 px minimum action/control height.
- Phase changes announce through `aria-live="polite"`; second-by-second countdown is excluded from live announcements.
- Reduced-motion media query keeps a static ring while timer text continues.
- Backgrounding pauses the cycle without accumulating time or emitting late burst chimes.
- No microphone, network, analytics, external media, or autoplay dependency.
- Audio requires an explicit Start interaction; mute remains user controlled.

## Manual audit still required before public release

Check keyboard order and focus visibility at 200% and 400% zoom, 320 px width, forced-colors/high-contrast, at least one screen reader with each supported browser, browser autoplay restrictions, and actual touch targets. Test with reduced-motion enabled and with audio unavailable. The static audit does not certify complete WCAG conformance.
