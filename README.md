# NES Player PWA

A Progressive Web App that emulates NES games with custom retro-style touch controls.

## Setup

```bash
cd nes-pwa
npm install
npm run dev
```

Then open http://localhost:3000 on your phone (same network) or browser.

## Adding ROMs

Place `.nes` ROM files in `public/roms/` and they will appear in the game selector.

Update the fallback ROM list in `src/app/page.tsx` if needed.

## Install as PWA

On mobile Chrome/Safari, tap "Add to Home Screen" for a full-screen app experience.

## Controls

- **D-Pad** — directional movement (red circles, left side)
- **A / B** — action buttons (purple/indigo circles, right side)
- **SELECT / START** — menu buttons (pink rectangles, center)
