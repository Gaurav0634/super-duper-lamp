# Food Archery AR

This version is a real WebXR AR app rather than a fake camera-backed mockup.

## What it does

- starts an immersive AR session
- uses hit testing to detect a table surface
- lets the player place the battlefield on the real table
- anchors floating food targets in world space
- uses center-aim tap shooting with light aim assist
- runs 30-second rounds with scoring, combo bonuses, rewards, and a local leaderboard

## Files

- `index.html` - app shell and in-session UI overlay
- `styles.css` - landing page and AR overlay styling
- `app.js` - WebXR setup, Three.js scene, hit-test placement, target motion, scoring, and results flow

## Run requirements

This app needs:

- a WebXR-capable mobile browser
- HTTPS or localhost
- internet access to load the Three.js ES modules from CDN

## Best test setup

1. Serve this folder over HTTPS or through a localhost tunnel.
2. Open it on a supported Android phone in Chrome.
3. Tap `Enter AR`.
4. Scan the table until a placement reticle appears.
5. Tap to place the battlefield, then tap again to shoot.

## Notes

- iPhone Safari does not provide the same WebXR support path, so this exact implementation is aimed at Android/WebXR first.
- If you need cross-platform production deployment, the next practical step is usually either a native app wrapper or a commercial WebAR stack.
