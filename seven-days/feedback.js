/**
 * feedback.js — Shared feedback system for 7 Days of Sound & Light
 * 
 * Works with localStorage immediately. When Supabase credentials are set,
 * syncs to a shared database so everyone sees each other's comments.
 * 
 * Usage: <script src="../feedback.js"></script>
 *        Feedback.init({ page: 'day1' })
 */

const Feedback = (() => {
  // ── Config: set these when Supabase is ready ──
  const SUPABASE_URL = null;   // e.g. 'https://xxx.supabase.co'
  const SUPABASE_ANON = null;  // public anon key

  const LS_KEY = 'sdl_feedback';
  const LS_NAME = 'sdl_username';

  let currentPage = 'unknown';
  let container = null;
  let listEl = null;

  // ── Storage ──

  function getAll() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
    catch { return []; }
  }

  function saveLocal(entry) {
    const all = getAll();
    all.push(entry);
    localStorage.setItem(LS_KEY, JSON.stringify(all));
  }

  function getForPage(page) {
    return getAll().filter(e => e.page === page);
  }

  function getSavedName() {
    return localStorage.getItem(LS_NAME) || '';
  }

  function saveName(name) {
    if (name) localStorage.setItem(LS_NAME, name);
  }

  // ── Supabase (when ready) ──

  async function syncToSupabase(entry) {
    if (!SUPABASE_URL || !SUPABASE_ANON) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(entry)
      });
    } catch (e) { console.warn('Supabase sync failed:', e); }
  }

  async function fetchFromSupabase(page) {
    if (!SUPABASE_URL || !SUPABASE_ANON) return null;
    try {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/feedback?page=eq.${page}&order=created_at.asc`,
        { headers: { 'apikey': SUPABASE_ANON, 'Authorization': `Bearer ${SUPABASE_ANON}` } }
      );
      return await r.json();
    } catch { return null; }
  }

  // ── UI ──

  function createWidget() {
    container = document.createElement('div');
    container.id = 'sdl-feedback';
    container.innerHTML = `
      <style>
        #sdl-feedback {
          position: fixed; bottom: 0; left: 0; right: 0;
          z-index: 9999; font-family: 'JetBrains Mono', 'Courier New', monospace;
        }
        #sdl-fb-toggle {
          position: fixed; bottom: 16px; right: 16px; z-index: 10000;
          background: none; border: 1px solid #333; color: #888;
          font-family: inherit; font-size: 8px; letter-spacing: 0.12em;
          padding: 6px 12px; cursor: pointer; text-transform: uppercase;
          transition: all 0.3s;
        }
        #sdl-fb-toggle:hover { border-color: rgb(220,190,120); color: rgb(220,190,120); }
        #sdl-fb-toggle.has-count::after {
          content: attr(data-count); margin-left: 6px; opacity: 0.5;
        }
        #sdl-fb-panel {
          position: fixed; bottom: 0; left: 0; right: 0;
          background: rgba(0,0,0,0.97); border-top: 1px solid #222;
          max-height: 0; overflow: hidden; transition: max-height 0.4s ease;
        }
        #sdl-fb-panel.open { max-height: 70vh; overflow-y: auto; }
        #sdl-fb-inner { padding: 24px; max-width: 560px; margin: 0 auto; }
        #sdl-fb-panel h3 {
          font-size: 8px; letter-spacing: 0.15em; color: #888;
          text-transform: uppercase; margin-bottom: 16px;
        }
        .sdl-fb-entry {
          margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #111;
        }
        .sdl-fb-entry:last-child { border-bottom: none; }
        .sdl-fb-name { font-size: 8px; color: rgb(220,190,120); letter-spacing: 0.08em; }
        .sdl-fb-time { font-size: 7px; color: #444; margin-left: 8px; }
        .sdl-fb-msg { font-size: 9px; color: #aaa; line-height: 1.6; margin-top: 4px; letter-spacing: 0.03em; }
        .sdl-fb-form { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
        .sdl-fb-row { display: flex; gap: 8px; }
        .sdl-fb-form input, .sdl-fb-form textarea {
          background: #0a0a0a; border: 1px solid #222; color: #ccc;
          font-family: inherit; font-size: 9px; padding: 8px 10px;
          letter-spacing: 0.04em; outline: none; transition: border-color 0.3s;
        }
        .sdl-fb-form input:focus, .sdl-fb-form textarea:focus {
          border-color: #555;
        }
        .sdl-fb-form input { flex: 1; }
        .sdl-fb-form textarea { width: 100%; resize: vertical; min-height: 48px; line-height: 1.5; }
        .sdl-fb-form button {
          align-self: flex-end; background: none; border: 1px solid #333;
          color: #888; font-family: inherit; font-size: 8px;
          letter-spacing: 0.12em; padding: 6px 16px; cursor: pointer;
          text-transform: uppercase; transition: all 0.3s;
        }
        .sdl-fb-form button:hover { border-color: rgb(220,190,120); color: rgb(220,190,120); }
        .sdl-fb-empty { font-size: 8px; color: #555; letter-spacing: 0.06em; font-style: italic; }
        .sdl-fb-local-note { font-size: 7px; color: #333; margin-top: 8px; letter-spacing: 0.06em; }
      </style>
      <button id="sdl-fb-toggle">feedback</button>
      <div id="sdl-fb-panel">
        <div id="sdl-fb-inner">
          <h3>feedback</h3>
          <div id="sdl-fb-list"></div>
          <form class="sdl-fb-form" id="sdl-fb-form">
            <div class="sdl-fb-row">
              <input type="text" id="sdl-fb-name" placeholder="name (optional)" maxlength="40" />
            </div>
            <textarea id="sdl-fb-message" placeholder="what do you think? what should change? what do you feel?" maxlength="1000" rows="2"></textarea>
            <button type="submit">send</button>
          </form>
          ${!SUPABASE_URL ? '<div class="sdl-fb-local-note">feedback is saved locally for now — shared comments coming soon</div>' : ''}
        </div>
      </div>
    `;

    document.body.appendChild(container);
    listEl = document.getElementById('sdl-fb-list');

    // Toggle
    const toggle = document.getElementById('sdl-fb-toggle');
    const panel = document.getElementById('sdl-fb-panel');
    toggle.addEventListener('click', () => {
      panel.classList.toggle('open');
      toggle.textContent = panel.classList.contains('open') ? 'close' : 'feedback';
    });

    // Restore name
    document.getElementById('sdl-fb-name').value = getSavedName();

    // Submit
    document.getElementById('sdl-fb-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('sdl-fb-name').value.trim() || 'anonymous';
      const message = document.getElementById('sdl-fb-message').value.trim();
      if (!message) return;

      const entry = {
        id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2),
        page: currentPage,
        name,
        message,
        created_at: new Date().toISOString(),
        ua: navigator.userAgent.slice(0, 120)
      };

      saveName(name);
      saveLocal(entry);
      await syncToSupabase(entry);

      document.getElementById('sdl-fb-message').value = '';
      renderList();
      updateCount();
    });
  }

  function renderList() {
    const entries = getForPage(currentPage);
    if (!entries.length) {
      listEl.innerHTML = '<div class="sdl-fb-empty">no feedback yet — be the first</div>';
      return;
    }
    listEl.innerHTML = entries.map(e => {
      const t = new Date(e.created_at);
      const timeStr = t.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
        ' ' + t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `<div class="sdl-fb-entry">
        <span class="sdl-fb-name">${esc(e.name || 'anonymous')}</span>
        <span class="sdl-fb-time">${timeStr}</span>
        <div class="sdl-fb-msg">${esc(e.message)}</div>
      </div>`;
    }).join('');
  }

  function updateCount() {
    const count = getForPage(currentPage).length;
    const toggle = document.getElementById('sdl-fb-toggle');
    if (count > 0) {
      toggle.classList.add('has-count');
      toggle.setAttribute('data-count', `(${count})`);
    }
  }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ── Info Panel (for piece pages) ──

  function createInfoPanel(info) {
    // info: { title, story, inspirations: [{name, url, note}], comments: [{name, message}] }
    const panel = document.createElement('div');
    panel.id = 'sdl-info';
    panel.innerHTML = `
      <style>
        #sdl-info-toggle {
          position: fixed; top: 16px; right: 16px; z-index: 10000;
          background: none; border: 1px solid #333; color: #888;
          font-family: 'JetBrains Mono', 'Courier New', monospace;
          font-size: 10px; width: 28px; height: 28px;
          cursor: pointer; transition: all 0.3s; display: flex;
          align-items: center; justify-content: center;
        }
        #sdl-info-toggle:hover { border-color: rgb(220,190,120); color: rgb(220,190,120); }
        #sdl-info-panel {
          position: fixed; top: 0; right: -360px; width: 340px; height: 100vh;
          background: rgba(0,0,0,0.97); border-left: 1px solid #222;
          z-index: 9998; padding: 60px 24px 24px; overflow-y: auto;
          transition: right 0.4s ease;
          font-family: 'JetBrains Mono', 'Courier New', monospace;
        }
        #sdl-info-panel.open { right: 0; }
        #sdl-info-panel h3 {
          font-size: 8px; letter-spacing: 0.15em; color: #888;
          text-transform: uppercase; margin: 20px 0 8px;
        }
        #sdl-info-panel h3:first-child { margin-top: 0; }
        #sdl-info-panel .info-story {
          font-size: 9px; color: #aaa; line-height: 1.7; letter-spacing: 0.03em;
        }
        #sdl-info-panel .info-insp {
          margin: 4px 0; font-size: 8px; line-height: 1.6;
        }
        #sdl-info-panel .info-insp a {
          color: rgb(220,190,120); text-decoration: none;
        }
        #sdl-info-panel .info-insp a:hover { color: rgb(255,248,230); }
        #sdl-info-panel .info-insp-note {
          color: #666; margin-left: 4px;
        }
        #sdl-info-panel .info-comment {
          margin: 8px 0; padding: 8px; border-left: 1px solid #222;
        }
        #sdl-info-panel .info-comment-name {
          font-size: 7px; color: rgb(220,190,120); letter-spacing: 0.1em;
        }
        #sdl-info-panel .info-comment-msg {
          font-size: 8px; color: #888; line-height: 1.5; margin-top: 2px;
        }
      </style>
      <button id="sdl-info-toggle">i</button>
      <div id="sdl-info-panel">
        <h3>about this piece</h3>
        <div class="info-story">${info.story || ''}</div>
        ${info.inspirations && info.inspirations.length ? `
          <h3>inspirations</h3>
          ${info.inspirations.map(i => `
            <div class="info-insp">
              ${i.url ? `<a href="${i.url}" target="_blank">${esc(i.name)}</a>` : esc(i.name)}
              ${i.note ? `<span class="info-insp-note">— ${esc(i.note)}</span>` : ''}
            </div>
          `).join('')}
        ` : ''}
        ${info.comments && info.comments.length ? `
          <h3>comments that shaped this</h3>
          ${info.comments.map(c => `
            <div class="info-comment">
              <div class="info-comment-name">${esc(c.name || 'anonymous')}</div>
              <div class="info-comment-msg">${esc(c.message)}</div>
            </div>
          `).join('')}
        ` : ''}
        <h3 style="margin-top:24px"><a href="../" style="color:#666;text-decoration:none;font-size:7px;letter-spacing:0.12em">← back to calendar</a></h3>
      </div>
    `;

    document.body.appendChild(panel);

    const infoToggle = document.getElementById('sdl-info-toggle');
    const infoPanel = document.getElementById('sdl-info-panel');
    infoToggle.addEventListener('click', () => {
      infoPanel.classList.toggle('open');
      infoToggle.textContent = infoPanel.classList.contains('open') ? '×' : 'i';
    });
  }

  // ── Public API ──

  async function init(opts = {}) {
    currentPage = opts.page || window.location.pathname.split('/').pop()?.replace('.html','') || 'index';
    createWidget();

    // Try loading from Supabase first
    const remote = await fetchFromSupabase(currentPage);
    if (remote && remote.length) {
      // Merge remote into local (dedupe by id)
      const local = getAll();
      const localIds = new Set(local.map(e => e.id));
      remote.forEach(e => {
        if (!localIds.has(e.id)) {
          local.push(e);
        }
      });
      localStorage.setItem(LS_KEY, JSON.stringify(local));
    }

    renderList();
    updateCount();

    // Info panel (if provided)
    if (opts.info) {
      createInfoPanel(opts.info);
    }
  }

  return { init };
})();
