// HUD, result screen, shop, menu buttons.
'use strict';

// DOM element cache.
const _dom = {
  caughtDisp:    document.getElementById('caughtDisp'),
  targetDisp:    document.getElementById('targetDisp'),
  lvlDisp:       document.getElementById('lvlDisp'),
  goldHud:       document.getElementById('goldHud'),
  phaseDisp:     document.getElementById('phaseDisp'),
  menuBest:      document.getElementById('menuBest'),
  menuScreen:    document.getElementById('menuScreen'),
  gameScreen:    document.getElementById('gameScreen'),
  shopScreen:    document.getElementById('shopScreen'),
  resultOverlay: document.getElementById('resultOverlay'),
  resTitle:      document.getElementById('resTitle'),
  rScoreNum:     document.getElementById('rScoreNum'),
  rCaught:       document.getElementById('rCaught'),
  rTarget:       document.getElementById('rTarget'),
  rHP:           document.getElementById('rHP'),
  rGold:         document.getElementById('rGold'),
  rBestScore:    document.getElementById('rBestScore'),
  rTotalGold:    document.getElementById('rTotalGold'),
  rNewBest:      document.getElementById('rNewBest'),
  nextBtn:       document.getElementById('nextBtn'),
  shopGold:      document.getElementById('shopGold'),
  shopItems:     document.getElementById('shopItems'),
  levelSelectScreen: document.getElementById('levelSelectScreen'),
  levelList:     document.getElementById('levelList'),
};


_dom.menuBest.textContent = Save.bestScore;

// Autoplay may be blocked until first user interaction; audio.js unlocks on input.
playMenuMusic();

// Tap-to-start overlay: visible until first interaction, then fades out.
const _audioPrompt = document.getElementById('audioPrompt');
let _promptDismissed = false;
function _dismissAudioPrompt() {
  if (_promptDismissed) return;
  _promptDismissed = true;
  window.removeEventListener('pointerdown', _dismissAudioPrompt);
  window.removeEventListener('keydown',     _dismissAudioPrompt);
  if (_audioPrompt) _audioPrompt.classList.add('hide');
  playMenuMusic();
}
window.addEventListener('pointerdown', _dismissAudioPrompt);
window.addEventListener('keydown',     _dismissAudioPrompt);

function updateHUD() {
  if (!G) return;
  _dom.caughtDisp.textContent = G.caught;
  _dom.targetDisp.textContent = G.cfg.target;
  _dom.lvlDisp.textContent    = `LEVEL ${G.cfg.n}`;
  _dom.goldHud.innerHTML = `<span class="ic ic-coin"></span> ${Save.gold + G.gold}`;
  if (G.phase === PH.FISHING) {
    const full  = '<span class="ic ic-hook"></span>'.repeat(G.hookHP);
    const lost  = '<span class="ic ic-heart"></span>'.repeat(G.maxHookHP - G.hookHP);
    _dom.phaseDisp.innerHTML = full + lost;
  }
}

function showResult() {
  stopVictory();
  const g      = G;
  // Passed = hit target and hook not broken.
  const passed = g.caught >= g.cfg.target && g.hookHP > 0;

  const isNew = g.caught > Save.bestScore && g.caught > 0;
  const earnedGold = g.gold;
  Save.gold += g.gold;
  if (g.caught > Save.bestScore) Save.bestScore = g.caught;
  if (passed) Save.markLevelPassed(g.idx);
  Save.flush();
  _dom.menuBest.textContent = Save.bestScore;

  _dom.resTitle.textContent = passed ? 'Congratulations!' : (g.hookHP <= 0 ? 'Hook Torn!' : 'Not Enough\u2026');
  _dom.resTitle.style.color = passed ? '#ffd166' : '#ff4d6d';

  _dom.rScoreNum.textContent = g.caught;

  _dom.rCaught.textContent    = g.caught;
  _dom.rTarget.textContent     = g.cfg.target;
  _dom.rHP.textContent         = `${g.hookHP}/${g.maxHookHP}`;
  _dom.rGold.textContent       = `+${g.gold}`;
  _dom.rBestScore.textContent  = Save.bestScore;
  _dom.rTotalGold.textContent  = Save.gold;

  _dom.rNewBest.hidden = !isNew;

  if (passed) { playVictory(); _spawnConfetti(); }
  else { _stopConfetti(); stopLevelMusic(); playTone(180, 'sawtooth', .4, .22); playTone(120, 'sawtooth', .5, .2, .08); }

  const isLast = g.idx >= LEVELS.length - 1;
  const nb     = _dom.nextBtn;
  nb.className = passed ? 'res-btn-primary' : 'res-btn-primary res-btn-fail';
  if (passed) {
    nb.textContent = isLast ? 'Play Again' : `Level ${g.idx + 2}`;
    nb.onclick = () => {
      stopVictory();
      const nextIdx = isLast ? 0 : g.idx + 1;
      Save.lastLevel = nextIdx;
      Save.flush();
      levelTransition(() => startLevel(nextIdx));
    };
  } else {
    nb.textContent = 'Try Again';
    nb.onclick = () => { stopVictory(); levelTransition(() => startLevel(g.idx)); };
  }

  const overlay = _dom.resultOverlay;
  overlay.classList.remove('hidden', 'res-passed', 'res-failed');
  overlay.classList.add(passed ? 'res-passed' : 'res-failed');
  overlay.offsetHeight;
  overlay.classList.add('show');

  _showGoldEarned(earnedGold, overlay);
}

function _showGoldEarned(amount, container) {
  if (amount <= 0) return;
  const el = document.createElement('div');
  el.className = 'gold-earned';
  el.innerHTML = `+${amount} <span class="ic ic-coin"></span>`;
  container.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// Confetti system.
const _confettiCanvas = document.getElementById('confettiCanvas');
const _confettiCtx = _confettiCanvas ? _confettiCanvas.getContext('2d') : null;
let _confettiPieces = [];
let _confettiAnimId = null;

const _CONFETTI_COLORS = [
  '#ffd166', '#ff9f1c', '#00ffe7', '#5bc8ef', '#e0aaff',
  '#ff4d6d', '#84ffff', '#ffb703', '#fff',
];

function _spawnConfetti() {
  if (!_confettiCanvas) return;
  const parent = _confettiCanvas.parentElement;
  _confettiCanvas.width = parent.offsetWidth;
  _confettiCanvas.height = parent.offsetHeight;

  _confettiPieces = [];
  const w = _confettiCanvas.width;
  const h = _confettiCanvas.height;

  for (let i = 0; i < 120; i++) {
    _confettiPieces.push({
      x: Math.random() * w,
      y: -10 - Math.random() * h * 0.5,
      vx: (Math.random() - 0.5) * 4,
      vy: 2 + Math.random() * 4,
      w: 4 + Math.random() * 6,
      h: 6 + Math.random() * 10,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.15,
      color: _CONFETTI_COLORS[Math.floor(Math.random() * _CONFETTI_COLORS.length)],
      alpha: 1,
    });
  }

  if (_confettiAnimId) cancelAnimationFrame(_confettiAnimId);
  _confettiAnimLoop();
}

function _confettiAnimLoop() {
  if (!_confettiCtx || _confettiPieces.length === 0) {
    _stopConfetti();
    return;
  }

  const cx = _confettiCtx;
  const w = _confettiCanvas.width;
  const h = _confettiCanvas.height;
  cx.clearRect(0, 0, w, h);

  let alive = 0;
  _confettiPieces.forEach(p => {
    if (p.alpha <= 0) return;
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.06;
    p.vx *= 0.99;
    p.rot += p.rotV;
    if (p.y > h * 0.75) p.alpha -= 0.02;

    cx.save();
    cx.globalAlpha = Math.max(0, p.alpha);
    cx.translate(p.x, p.y);
    cx.rotate(p.rot);
    cx.fillStyle = p.color;
    cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    cx.restore();
    if (p.alpha > 0) alive++;
  });

  if (alive > 0) {
    _confettiAnimId = requestAnimationFrame(_confettiAnimLoop);
  } else {
    _stopConfetti();
  }
}

function _stopConfetti() {
  if (_confettiAnimId) { cancelAnimationFrame(_confettiAnimId); _confettiAnimId = null; }
  if (_confettiCtx) _confettiCtx.clearRect(0, 0, _confettiCanvas.width, _confettiCanvas.height);
  _confettiPieces = [];
}

function openShop() {
  renderShop();
  _dom.menuScreen.classList.add('hidden');
  _dom.shopScreen.classList.remove('hidden');
}

function closeShop() {
  _dom.shopScreen.classList.add('hidden');
  _dom.menuScreen.classList.remove('hidden');
  _dom.menuBest.textContent = Save.bestScore;
}

function _makeShopCard(item, isUpgrade) {
  const lvl    = isUpgrade ? Save.getUpgradeLevel(item.id) : Save.getPowerup(item.id);
  const maxed  = lvl >= item.max;
  const cost   = maxed ? null : (isUpgrade ? item.costs[lvl] : item.cost);
  const canBuy = !maxed && Save.gold >= cost;

  const card = document.createElement('div');
  card.className = 'shop-card' + (maxed ? ' shop-maxed' : '');

  const stars = Array.from({ length: item.max }, (_, i) =>
    `<span class="shop-star ${i < lvl ? 'filled' : ''}">&#9733;</span>`
  ).join('');

  const iconHtml = (item.spriteKey && SKINS[item.spriteKey])
    ? `<img src="${SKINS[item.spriteKey]}" class="shop-sprite-icon" alt="${item.name}">`
    : item.icon;

  const previewText = isUpgrade && lvl > 0 && item.preview ? item.preview(lvl) : '';

  card.innerHTML = `
    <div class="shop-icon">${iconHtml}</div>
    <div class="shop-info">
      <div class="shop-name">${item.name}</div>
      <div class="shop-desc">${item.desc}</div>
      ${previewText ? `<div class="shop-preview">Current: ${previewText}</div>` : ''}
      <div class="shop-stars">${stars}</div>
    </div>
    <div class="shop-badge ${maxed ? 'shop-badge-max' : canBuy ? 'shop-badge-buy' : 'shop-badge-poor'}">
      ${maxed ? 'MAX' : `${cost} <span class="ic ic-coin"></span>`}
    </div>
  `;

  if (canBuy) {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      Save.gold -= cost;
      if (isUpgrade) Save.setUpgradeLevel(item.id, lvl + 1);
      else           Save.addPowerup(item.id);
      Save.flush();
      sfxBuy();
      renderShop();
    });
  } else {
    card.style.cursor = maxed ? 'default' : 'not-allowed';
    if (!maxed) card.addEventListener('click', () => sfxError());
  }

  return card;
}

function renderShop() {
  _dom.shopGold.innerHTML = `<span class="ic ic-coin"></span> ${Save.gold}`;
  const container = _dom.shopItems;
  container.innerHTML = '';
  const frag = document.createDocumentFragment();
  UPGRADES.forEach(u => frag.appendChild(_makeShopCard(u, true)));
  POWERUPS.forEach(p => frag.appendChild(_makeShopCard(p, false)));
  container.appendChild(frag);
}

function confirmReset() {
  if (G && G.phase !== PH.RESULT) return;
  if (confirm('Reset all progress (gold, upgrades, best score)?')) {
    Save.resetAll();
    renderShop();
    _dom.menuBest.textContent = 0;
    sfxError();
  }
}

const _RESULT_TRANSITION_MS = 600;

function _closeResult() {
  stopVictory();
  _stopConfetti();
  if (animId) { cancelAnimationFrame(animId); animId = null; }

  const overlay = _dom.resultOverlay;

  if (!overlay.classList.contains('show')) return;

  overlay.classList.remove('show');

  let done = false;
  const finalize = () => {
    if (done) return;
    done = true;
    overlay.removeEventListener('transitionend', onTransitionEnd);
    clearTimeout(fallbackTimer);
    overlay.classList.add('hidden');
  };

  const onTransitionEnd = (e) => {
    if (e.target !== overlay) return;
    finalize();
  };

  overlay.addEventListener('transitionend', onTransitionEnd);
  const fallbackTimer = setTimeout(finalize, _RESULT_TRANSITION_MS);
}

// Level select screen. Biome id → icon emoji for the level card.
const _BIOME_ICON = { ocean: '\u{1F30A}', swamp: '\u{1FAB5}', polar: '\u2744\uFE0F' };
const _DIFF_LABEL = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

function renderLevelSelect() {
  const list = _dom.levelList;
  list.innerHTML = '';
  const frag = document.createDocumentFragment();

  LEVELS.forEach((lv, idx) => {
    const biome    = BIOMES[lv.biome] || BIOMES.ocean;
    const unlocked = Save.isUnlocked(idx);
    const icon     = unlocked ? (_BIOME_ICON[biome.id] || '\u{1F30A}') : '\u{1F512}';
    const diffTxt  = _DIFF_LABEL[biome.difficulty] || biome.difficulty;

    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'level-card diff-' + biome.difficulty + (unlocked ? '' : ' locked');
    card.disabled = !unlocked;
    card.innerHTML =
      `<div class="lc-icon">${icon}</div>` +
      `<div class="lc-body">` +
        `<div class="lc-title">${lv.label}</div>` +
        `<div class="lc-sub">${biome.label} · Target ${lv.target} fish</div>` +
      `</div>` +
      `<div class="lc-diff">${unlocked ? diffTxt : 'LOCKED'}</div>`;

    if (unlocked) {
      card.addEventListener('click', () => {
        sfxSplash();
        Save.lastLevel = idx;
        Save.flush();
        levelTransition(() => {
          _dom.levelSelectScreen.classList.add('hidden');
          startLevel(idx);
        });
      });
    } else {
      card.addEventListener('click', () => sfxError());
    }
    frag.appendChild(card);
  });

  list.appendChild(frag);
}

function openLevelSelect() {
  renderLevelSelect();
  _dom.menuScreen.classList.add('hidden');
  _dom.levelSelectScreen.classList.remove('hidden');
}

function closeLevelSelect() {
  _dom.levelSelectScreen.classList.add('hidden');
  _dom.menuScreen.classList.remove('hidden');
}

// Main menu buttons.
document.getElementById('startBtn').addEventListener('click', () => {
  screenTransition(() => openLevelSelect());
});
document.getElementById('levelSelectBackBtn').addEventListener('click', () => {
  screenTransition(() => closeLevelSelect());
});
document.getElementById('shopBtn').addEventListener('click', () => {
  screenTransition(() => openShop());
});
document.getElementById('shopCloseBtn').addEventListener('click', () => {
  screenTransition(() => closeShop());
});
document.getElementById('resetBtn').addEventListener('click',  confirmReset);

// Mute button — all screens share the same state.
const _muteBtns = [
  document.getElementById('muteBtn'),
  document.getElementById('muteBtnPause'),
  document.getElementById('muteBtnLS'),
  document.getElementById('muteBtnShop'),
].filter(Boolean);
function _refreshMuteBtn() {
  if (!_muteBtns.length) return;
  const m = isMuted();
  const icon = m ? '\u{1F507}' : '\u{1F50A}'; // 🔇 / 🔊
  const label = m ? 'Unmute sound' : 'Mute sound';
  _muteBtns.forEach(btn => {
    btn.textContent = icon;
    btn.classList.toggle('muted', m);
    btn.setAttribute('aria-label', label);
  });
}
_muteBtns.forEach(btn => {
  btn.addEventListener('click', () => { toggleMute(); _refreshMuteBtn(); });
});
_refreshMuteBtn();

document.getElementById('rMenuBtn').addEventListener('click', () => {
  screenTransition(() => {
    _closeResult();
    stopLevelMusic();
    playMenuMusic();
    _dom.gameScreen.classList.add('hidden');
    _dom.menuScreen.classList.remove('hidden');
    _dom.menuBest.textContent = Save.bestScore;
  });
});

document.getElementById('pauseMenuBtn').addEventListener('click', () => {
  if (!G || !G.isPaused) return;
  G.isPaused = false;
  _dom.gameScreen.classList.remove('paused');
  levelTransition(() => {
    stopVictory();
    stopLevelMusic();
    playMenuMusic();
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    G = null;
    _dom.gameScreen.classList.add('hidden');
    _dom.menuScreen.classList.remove('hidden');
    _dom.menuBest.textContent = Save.bestScore;
  });
});

