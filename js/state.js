// Shared mutable game state.
'use strict';

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

// Log errors without breaking the loop.
window.addEventListener('error', (e) => {
  console.error('[GlobalError]', e.message, e.error);
});
window.addEventListener('unhandledrejection', (e) => {
  console.error('[UnhandledRejection]', e.reason);
});

let G = null;
let animId = null;
