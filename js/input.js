// Pointer and keyboard input handling.
'use strict';

// ─── 1. CANVAS RECT CACHE ─────────────────────────────────────────────────────
// getBoundingClientRect is called at most once per frame by caching the result.
// Invalidated on resize or scroll so coordinate mapping stays accurate.

let _inputRect = null;
function _invalidateInputRect() { _inputRect = null; }
window.addEventListener('resize', _invalidateInputRect, { passive: true });
window.addEventListener('scroll', _invalidateInputRect, { passive: true });

// ─── 2. INPUT OBJECT ──────────────────────────────────────────────────────────
// init() wires pointer and keyboard events; _tickKeyboard() is called each
// physics tick by the game loop to apply held-key movement.

const Input = {
  init(canvasEl) {

    // Pointer: map client X to canvas-space hook position.
    canvasEl.addEventListener('pointermove', (e) => {
      if (!G || G.phase !== PH.FISHING || G.isPaused) return;
      Input._moveHook(canvasEl, e.clientX);
    });

    // Keyboard: Escape toggles pause; A/D and arrow keys move the hook.
    const _keys = {};
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && G && G.phase === PH.FISHING) {
        G.isPaused = !G.isPaused;
        const gs = document.getElementById('gameScreen');
        if (gs) gs.classList.toggle('paused', G.isPaused);
        return;
      }
      _keys[e.key] = true;
    });
    window.addEventListener('keyup', (e) => { _keys[e.key] = false; });

    const HOOK_SPEED = 5;
    Input._tickKeyboard = () => {
      if (!G || G.phase !== PH.FISHING || G.isPaused) return;
      let dx = 0;
      if (_keys['ArrowLeft']  || _keys['a'] || _keys['A']) dx -= HOOK_SPEED;
      if (_keys['ArrowRight'] || _keys['d'] || _keys['D']) dx += HOOK_SPEED;
      if (dx === 0) return;
      const half = G.HOOK_W / 2;
      G.hookX = Math.max(half, Math.min(G.cW - half, G.hookX + dx));
    };
  },

  invalidateRect: _invalidateInputRect,

  _moveHook(canvasEl, clientX) {
    let rect = _inputRect;
    if (!rect) { rect = canvasEl.getBoundingClientRect(); _inputRect = rect; }
    const mx   = (clientX - rect.left) * (G.cW / rect.width);
    const half = G.HOOK_W / 2;
    G.hookX = Math.max(half, Math.min(G.cW - half, mx));
  },
};
