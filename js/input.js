// Pointer + keyboard input.
'use strict';

// Cache canvas rect; invalidate on resize/scroll to avoid layout thrash.
let _inputRect = null;
function _invalidateInputRect() { _inputRect = null; }
window.addEventListener('resize', _invalidateInputRect, { passive: true });
window.addEventListener('scroll', _invalidateInputRect, { passive: true });

const Input = {
  init(canvasEl) {
    canvasEl.addEventListener('pointermove', (e) => {
      if (!G || G.phase !== PH.FISHING || G.isPaused) return;
      Input._moveHook(canvasEl, e.clientX);
    });

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
