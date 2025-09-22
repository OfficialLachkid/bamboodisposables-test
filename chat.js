import { createChat } from 'https://cdn.jsdelivr.net/npm/@n8n/chat/dist/chat.bundle.es.js';

/* ----------------------------
 * Headings
 * ---------------------------- */
const TITLE = 'Welkom bij Bamboo Disposables👋';
const SUBTITLE = 'Stel je vraag, we helpen je graag!';

/* Optional watermark behind messages (leave empty to disable) */
const WATERMARK_URL = './Assets/BambooImage.png'; // e.g. './Assets/watermark.png'

/* Your n8n Chat Trigger webhook */
const WEBHOOK_URL = 'https://n8n1.vbservices.org/webhook/e60ab9b2-0a77-4f7c-80d7-cf6c9534fbb9/chat';

/* ----------------------------
 * n8n widget init
 * ---------------------------- */
try {
  createChat({
    webhookUrl: WEBHOOK_URL,
    mode: 'window',
    target: '#n8n-chat',
    loadPreviousSession: true,
    showWelcomeScreen: false,
    defaultLanguage: 'en',
    initialMessages: ['Hoi! Waar kan ik je mee helpen?'],
    i18n: {
      en: {
        title: TITLE,
        subtitle: SUBTITLE,
        inputPlaceholder: 'Typ hier je bericht…',
        getStarted: 'Nieuw gesprek',
        footer: '',
      },
    },
    enableStreaming: false,
  });
} catch (err) {
  console.error('Failed to initialize n8n chat widget:', err);
  console.warn(
    'If you see a CORS error, add your origin (e.g. http://127.0.0.1:5501 and http://localhost:5501) to the Chat Trigger node’s "Allowed Origins", or configure CORS on your reverse proxy.'
  );
}

/* ----------------------------
 * Watermark in chat body
 * ---------------------------- */
const WINDOW_SELECTORS = [
  '.n8n-chat-window',
  '[class*="chat-window" i]',
  '[data-testid*="chat" i][role="dialog"]',
];

const BODY_SELECTORS = [
  '.n8n-chat-body',
  '[class*="chat-body" i]',
  '.n8n-chat-messages',
  '[class*="messages" i]',
];

function findChatWindow() {
  const root = document.querySelector('#n8n-chat') || document;
  for (const s of WINDOW_SELECTORS) {
    const el = root.querySelector(s) || document.querySelector(s);
    if (el) return el;
  }
  return null;
}

function findChatBody(winEl) {
  if (!winEl) return null;
  for (const s of BODY_SELECTORS) {
    const el = winEl.querySelector(s) || document.querySelector(s);
    if (el) return el;
  }
  return null;
}

function applyWatermark() {
  // Only apply if a URL is set
  const url = (typeof WATERMARK_URL === 'string' && WATERMARK_URL.trim()) ? WATERMARK_URL : null;
  if (!url) return false;

  const win = findChatWindow();
  const body = findChatBody(win);
  if (!body) return false;

  body.style.backgroundImage = `url("${url}")`;
  body.style.backgroundRepeat = 'no-repeat';

  // Center perfectly in the chat body
  body.style.backgroundPosition = 'center center';

  // Keep the whole image visible (no cropping)
  body.style.backgroundSize = 'contain';

  // Make it scroll with the messages (feel free to change to 'fixed' if you prefer)
  body.style.backgroundAttachment = 'local';

  // If the body has padding, keep the image inside the padded area
  body.style.backgroundOrigin = 'content-box';
  body.style.backgroundClip = 'content-box';

  return true;
}

/* ----------------------------
 * Resizable: W, N, NW
 * ---------------------------- */
const MIN_W = 320;
const MIN_H = 420;

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function getVarPx(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}
function setVarPx(name, px) {
  document.documentElement.style.setProperty(name, `${px}px`);
}

function maxW() { return Math.min(1000, Math.floor(window.innerWidth * 0.95)); }
function maxH() { return Math.min(1000, Math.floor(window.innerHeight * 0.90)); }

function injectHandles(winEl) {
  if (!winEl || winEl.dataset.dimHandles === '1') return;
  winEl.style.position = winEl.style.position || 'fixed';

  const hW  = document.createElement('div'); hW.className  = 'dim-handle dim-handle-w';  hW.tabIndex  = 0;
  const hN  = document.createElement('div'); hN.className  = 'dim-handle dim-handle-n';  hN.tabIndex  = 0;
  const hNW = document.createElement('div'); hNW.className = 'dim-handle dim-handle-nw'; hNW.tabIndex = 0;

  winEl.appendChild(hW); winEl.appendChild(hN); winEl.appendChild(hNW);
  winEl.dataset.dimHandles = '1';

  const overlay = document.getElementById('dim-resize-capture');

  function startDrag(mode, startEvent) {
    startEvent.preventDefault();

    const rect = winEl.getBoundingClientRect();
    const startX = startEvent.clientX;
    const startY = startEvent.clientY;

    const startW = getVarPx('--chat--window--width',  rect.width  || 420);
    const startH = getVarPx('--chat--window--height', rect.height || 600);

    overlay.classList.add('is-active');
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = 'none';

    function onMove(e) {
      let w = startW, h = startH;
      const dx = e.clientX - startX;  // + right
      const dy = e.clientY - startY;  // + down

      if (mode.includes('w')) { w = clamp(startW - dx, MIN_W, maxW()); } // drag left edge
      if (mode.includes('n')) { h = clamp(startH - dy, MIN_H, maxH()); } // drag top edge

      setVarPx('--chat--window--width',  w);
      setVarPx('--chat--window--height', h);
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      overlay.classList.remove('is-active');
      document.body.style.userSelect = prevUserSelect;
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Mouse resize
  hW.addEventListener('mousedown',  (e) => startDrag('w',  e));
  hN.addEventListener('mousedown',  (e) => startDrag('n',  e));
  hNW.addEventListener('mousedown', (e) => startDrag('wn', e));

  // Keyboard fallback
  function keyResize(mode, e) {
    const STEP = e.shiftKey ? 40 : 12;
    let w = getVarPx('--chat--window--width',  420);
    let h = getVarPx('--chat--window--height', 600);

    if (mode.includes('w')) {
      if (e.key === 'ArrowLeft')  w = clamp(w + STEP, MIN_W, maxW());
      if (e.key === 'ArrowRight') w = clamp(w - STEP, MIN_W, maxW());
    }
    if (mode.includes('n')) {
      if (e.key === 'ArrowUp')    h = clamp(h + STEP, MIN_H, maxH());
      if (e.key === 'ArrowDown')  h = clamp(h - STEP, MIN_H, maxH());
    }
    setVarPx('--chat--window--width',  w);
    setVarPx('--chat--window--height', h);
    e.preventDefault();
  }
  hW.addEventListener('keydown',  (e) => keyResize('w',  e));
  hN.addEventListener('keydown',  (e) => keyResize('n',  e));
  hNW.addEventListener('keydown', (e) => keyResize('wn', e));
}

/* Add handles + (optional) watermark once the widget exists */
function ensureEnhancements() {
  const win = findChatWindow();
  if (!win) return false;
  injectHandles(win);
  applyWatermark();
  return true;
}
if (!ensureEnhancements()) {
  const mo = new MutationObserver(() => { if (ensureEnhancements()) mo.disconnect(); });
  mo.observe(document.documentElement, { childList: true, subtree: true });
}

/* Keep sizes in viewport on window resize + refresh watermark */
window.addEventListener('resize', () => {
  const w = getVarPx('--chat--window--width',  420);
  const h = getVarPx('--chat--window--height', 600);
  setVarPx('--chat--window--width',  clamp(w, MIN_W, maxW()));
  setVarPx('--chat--window--height', clamp(h, MIN_H, maxH()));
  applyWatermark();
});

/* Helpful console hint if the webhook fails due to CORS */
window.addEventListener('unhandledrejection', (ev) => {
  const msg = String(ev?.reason || '');
  if (msg.includes('Failed to fetch')) {
    console.warn(
      'The n8n webhook request failed. If this is a CORS error, set Allowed Origins on the Chat Trigger to include your dev origin(s): http://127.0.0.1:5501 and http://localhost:5501'
    );
  }
});