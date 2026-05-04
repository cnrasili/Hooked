// Shared canvas context and global mutable game state.
'use strict';

// ─── 1. CANVAS CONTEXT ────────────────────────────────────────────────────────
// Obtained once here; every other module writes through _stateCtx and reads
// canvas dimensions from G (built per-level in game.js).

const _stateCanvas = document.getElementById('canvas');
if (!_stateCanvas) throw new Error('#canvas element not found');
const _stateCtx = _stateCanvas.getContext('2d');
if (!_stateCtx) {
  document.body.innerHTML =
    '<div style="color:#fff;background:#041025;font-family:sans-serif;' +
    'padding:40px;text-align:center;min-height:100vh;display:flex;' +
    'align-items:center;justify-content:center;">' +
    '<div><h1>Canvas Not Supported</h1>' +
    '<p>Your browser does not support HTML5 Canvas 2D. ' +
    'Please use a modern browser (Chrome, Firefox, Safari, Edge).</p></div></div>';
  throw new Error('Canvas 2D context unavailable');
}

// ─── 2. GLOBAL ERROR HANDLERS ─────────────────────────────────────────────────
// Log unexpected errors without crashing the page. The game loop has its own
// per-frame error boundary (game.js) that halts after repeated failures.

window.addEventListener('error', (e) => {
  console.error('[GlobalError]', e.message, e.error);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[UnhandledRejection]', e.reason);
});

// ─── 3. GAME STATE ────────────────────────────────────────────────────────────
// G holds the active level state object (built by _buildGameState in game.js).
// animId is the current requestAnimationFrame handle.

let G = null;
let animId = null;
