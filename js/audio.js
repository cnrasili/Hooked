// Sound effects (Web Audio API) and background music (HTMLAudioElement).
'use strict';

// ─── 1. AUDIO CONTEXT ────────────────────────────────────────────────────────
// Web Audio requires a user gesture before the context can run.
// _unlockAudio is registered on the first pointer/key event and removed
// once the context reaches 'running' state.

let audioCtx = null;
let _muted = false;

function isMuted() { return _muted; }

function toggleMute() {
  _muted = !_muted;
  // Mute/unmute by volume only — tracks keep playing so position is preserved.
  const v = _muted ? 0 : BG_MUSIC_VOL;
  if (_menuAudio)    _menuAudio.volume    = v;
  if (_levelAudio)   _levelAudio.volume   = v;
  if (_victoryAudio) _victoryAudio.volume = v;

  if (!_muted) {
    // Guard: if game is in fishing phase, level track must be active.
    const inGame = typeof G !== 'undefined' && G && G.phase === PH.FISHING;
    if (inGame && _currentBgTrack !== 'level') {
      console.warn('[Audio] Track mismatch on unmute (was "%s") — correcting to level.', _currentBgTrack);
      _currentBgTrack = 'level';
    }
  }
  return _muted;
}

// Lazy AudioContext getter — created on first use to avoid autoplay restrictions.
function ac() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

const _AUDIO_UNLOCK_EVENTS = ['pointerdown', 'keydown', 'touchstart'];

function _unlockAudio() {
  const a = ac();
  if (a.state === 'running') { _removeAudioUnlockListeners(); return; }
  a.resume().then(() => {
    _removeAudioUnlockListeners();
  }).catch(err => {
    console.warn('[Audio] AudioContext.resume() failed:', err);
  });
}

function _removeAudioUnlockListeners() {
  _AUDIO_UNLOCK_EVENTS.forEach(ev => window.removeEventListener(ev, _unlockAudio));
}

_AUDIO_UNLOCK_EVENTS.forEach(ev => window.addEventListener(ev, _unlockAudio));

// ─── 2. SOUND EFFECTS ────────────────────────────────────────────────────────
// All SFX are synthesised via Web Audio oscillators and gain envelopes —
// no external audio files. playTone() is the shared primitive; named helpers
// above it define each game event's sound.

function playTone(freq, type, dur, vol, delay = 0) {
  if (_muted) return;
  try {
    const a = ac();
    if (a.state === 'suspended') a.resume().catch(() => {});
    const o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, a.currentTime + delay);
    g.gain.setValueAtTime(0, a.currentTime + delay);
    g.gain.linearRampToValueAtTime(vol, a.currentTime + delay + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + delay + dur);
    o.start(a.currentTime + delay);
    o.stop(a.currentTime + delay + dur + 0.05);
  } catch (err) {
    console.warn('[Audio] playTone failed:', err);
  }
}

function sfxCatch() {
  playTone(440, 'sine', 0.07, 0.14);
  playTone(523, 'sine', 0.07, 0.12, 0.07);
}

function sfxCoin() {
  playTone(880,  'sine', 0.06, 0.12);
  playTone(1100, 'sine', 0.06, 0.10, 0.05);
}

function sfxBuy() {
  playTone(440, 'sine', 0.08, 0.15);
  playTone(554, 'sine', 0.08, 0.15, 0.07);
  playTone(659, 'sine', 0.12, 0.15, 0.14);
}

function sfxError() {
  playTone(200, 'sawtooth', 0.12, 0.18);
  playTone(160, 'sawtooth', 0.14, 0.16, 0.06);
}

function sfxHit() {
  playTone(160, 'sawtooth', 0.14, 0.24);
  playTone(110, 'sawtooth', 0.18, 0.20, 0.05);
}

// Splash: bandpass-filtered white noise burst (hook entering water).
let _splashBuf     = null;
let _splashBufRate = 0;

function _getSplashBuffer(a) {
  if (_splashBuf && _splashBufRate === a.sampleRate) return _splashBuf;
  const len = Math.round(a.sampleRate * 0.3);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d   = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  _splashBuf     = buf;
  _splashBufRate = a.sampleRate;
  return buf;
}

function sfxSplash() {
  if (_muted) return;
  try {
    const a = ac();
    if (a.state === 'suspended') a.resume().catch(() => {});
    const src = a.createBufferSource();
    const g   = a.createGain();
    const f   = a.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 0.6;
    src.buffer = _getSplashBuffer(a);
    src.connect(f); f.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(0.18, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.3);
    src.start(); src.stop(a.currentTime + 0.35);
  } catch (err) {
    console.warn('[Audio] sfxSplash failed:', err);
  }
}

// ─── 3. BACKGROUND MUSIC ─────────────────────────────────────────────────────
// Three looping HTMLAudioElement tracks: menu, per-level, and victory.
// Only one plays at a time; muting sets volume to 0 instead of pausing
// so the playback position is preserved if the player unmutes mid-track.

const _menuAudio    = document.getElementById('menuMusic');
const _levelAudio   = document.getElementById('levelMusic');
const _victoryAudio = document.getElementById('victoryMusic');

const BG_MUSIC_VOL = 0.30;
if (_menuAudio)    _menuAudio.volume    = BG_MUSIC_VOL;
if (_levelAudio)   _levelAudio.volume   = BG_MUSIC_VOL;
if (_victoryAudio) _victoryAudio.volume = BG_MUSIC_VOL;

let _currentBgTrack = null; // 'menu' | 'level' | null

// Always starts playback; volume is 0 when muted so position keeps advancing.
function _tryPlay(el) {
  if (!el) return;
  el.volume = _muted ? 0 : BG_MUSIC_VOL;
  el.play().catch(err => console.warn('[Audio] bg music play failed:', err));
}

function playMenuMusic() {
  if (!_menuAudio) return;
  _currentBgTrack = 'menu';
  if (_levelAudio && !_levelAudio.paused) { _levelAudio.pause(); _levelAudio.currentTime = 0; }
  _tryPlay(_menuAudio);
}

function playLevelMusic(idx) {
  if (!_levelAudio) return;
  _currentBgTrack = 'level';
  if (_menuAudio && !_menuAudio.paused) _menuAudio.pause();
  const src = `sounds/musics/Level${idx + 1}Music.mp3`;
  if (!_levelAudio.src.endsWith(src)) {
    _levelAudio.src = src;
  }
  _levelAudio.currentTime = 0;
  _tryPlay(_levelAudio);
}

function stopLevelMusic() {
  if (_levelAudio) { _levelAudio.pause(); _levelAudio.currentTime = 0; }
}

function playVictory() {
  stopVictory();
  if (_levelAudio) _levelAudio.pause();
  if (_menuAudio)  _menuAudio.pause();
  if (!_victoryAudio) return;
  _victoryAudio.currentTime = 0;
  _tryPlay(_victoryAudio);
}

function stopVictory() {
  if (_victoryAudio) { _victoryAudio.pause(); _victoryAudio.currentTime = 0; }
}
