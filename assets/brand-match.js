/* ------------------------------------------------------------------
   Brand matching — context.dev-style domain lookup for Sugarhead.
   Extracted from smart-blocks-config/template-flow/index.html
------------------------------------------------------------------- */
(function () {
  /* The template flow draws Nike's mark rather than an "N" — a brand that
     has a logo should show it. Brands without one fall back to the initial. */
  const SWOOSH = '<svg viewBox="0 0 24 24" width="26" height="13" aria-hidden="true"><path d="M24 7.8 6.442 15.276c-1.456.616-2.679.925-3.668.925-1.11 0-1.922-.392-2.437-1.177-.317-.503-.4-1.152-.25-1.947.152-.795.532-1.643 1.14-2.543.505-.75 1.371-1.708 2.6-2.874-.365.615-.766 1.395-1.084 2.155-.55 1.32-.68 2.4-.394 3.24.13.375.365.65.68.83.36.2.83.29 1.41.29.44 0 .93-.06 1.47-.18L24 7.8Z" fill="currentColor"/></svg>';

  const BRANDS = {
    lumina: {
      key: 'lumina', name: 'Lumina', site: 'lumina.com', initial: 'L', sector: 'Skincare',
      accent: '#C2426A', wash: '#F6EFEA', ink: '#fff',
      swatches: ['#C2426A', '#F6EFEA', '#2C2A33', '#D9A441'],
      tone: 'Warm, plain, evidence-led', type: 'Canela · Söhne',
    },
    nike: {
      key: 'nike', name: 'Nike', site: 'nike.com', initial: 'N', sector: 'Sportswear', logo: SWOOSH,
      accent: '#FA5400', wash: '#F5F5F5', ink: '#fff',
      swatches: ['#FA5400', '#111111', '#FFFFFF', '#F5F5F5'],
      tone: 'Direct, urgent, athlete-first', type: 'Futura · Helvetica Now',
    },
    none: {
      key: 'none', name: 'Your company', site: '', initial: '?', sector: '',
      accent: '#1C84E0', wash: '#FAFAFA', ink: '#fff',
      swatches: ['#1C84E0', '#FAFAFA', '#252525', '#8E8E8E'],
      tone: 'Neutral', type: 'Geist · system',
    },
  };

  const DIRECTORY = { 'lumina.com': 'lumina', 'nike.com': 'nike' };
  const FREEMAIL = [
    'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
    'yahoo.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com', 'aol.com',
  ];

  let activeKey = 'none';
  let activeEmail = '';

  function hashStr(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function hsl2hex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    const hx = (n) => Math.round(255 * f(n)).toString(16).padStart(2, '0');
    return (`#${hx(0)}${hx(8)}${hx(4)}`).toUpperCase();
  }

  function inkFor(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#fff';
    const n = parseInt(m[1], 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    const L = 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
    return L > 0.45 ? '#26251E' : '#fff';
  }

  function makeBrand(domain) {
    const stem = domain.split('.')[0].replace(/[^a-z0-9]/gi, '');
    const name = stem.charAt(0).toUpperCase() + stem.slice(1);
    const hue = hashStr(domain) % 360;
    const accent = hsl2hex(hue, 62, 44);
    const wash = hsl2hex(hue, 34, 96);
    /* Same hue, four roles: the accent, its wash, a near-black for text
       and a complementary hue so the row does not read as one colour. */
    const swatches = [accent, wash, hsl2hex(hue, 18, 14), hsl2hex((hue + 40) % 360, 48, 52)];
    return Object.assign({}, BRANDS.none, {
      key: `d:${domain}`,
      name,
      site: domain,
      initial: name.charAt(0),
      sector: 'Matched from your email',
      accent,
      wash,
      swatches,
      ink: inkFor(accent),
      tone: 'Clear, plain, straight to the point',
      type: 'Geist · system',
      generated: true,
    });
  }

  function resolveBrand(email) {
    const at = String(email || '').indexOf('@');
    if (at < 1) return null;
    const domain = email.slice(at + 1).trim().toLowerCase().replace(/^www\./, '');
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) return null;
    if (FREEMAIL.includes(domain)) return { domain, personal: true, key: null };
    const known = DIRECTORY[domain];
    if (known) return { domain, personal: false, key: known };
    const b = makeBrand(domain);
    BRANDS[b.key] = b;
    return { domain, personal: false, key: b.key };
  }

  /** The mark for a brand: its logo if it has one, else its initial. */
  function logoHtml(b) {
    return b && b.logo ? b.logo : (b && b.initial) || '?';
  }

  function getBrand(key) {
    return BRANDS[key || activeKey] || BRANDS.none;
  }

  function setActive(key, email) {
    activeKey = key || 'none';
    activeEmail = email || '';
    applyBrandVars();
    return getBrand(activeKey);
  }

  function applyBrandVars(root) {
    const b = getBrand(activeKey);
    const el = root || document.documentElement;
    el.style.setProperty('--bd-brand-accent', b.accent);
    el.style.setProperty('--bd-brand-wash', b.wash);
    el.style.setProperty('--bd-brand-ink', b.ink);
  }

  function matchHint(m) {
    if (!m) return 'We read the domain, not the inbox — try <b>lumina.com</b> or your company domain.';
    if (m.personal) return `<b>${m.domain}</b> is a personal address — the app stays unbranded.`;
    const b = BRANDS[m.key];
    return b.generated
      ? `Reading <b>${m.domain}</b> — the preview will wear what we find.`
      : `Matched <b>${b.name}</b>. The preview is already wearing it.`;
  }

  /**
   * Workspace + brand setup card.
   *
   * Ported from smart-blocks-config/template-flow/index.html — variation B,
   * `workspaceCard()` + `expansion('brand')` + `wireWorkspace()`. Same
   * markup, same class names (scoped under .bd-setup-card so bare names
   * like .q and .count cannot collide with the builder's own CSS), same
   * behaviour: the workspace name follows the brand until you name it
   * yourself, and every keystroke repaints the preview without losing the
   * caret.
   *
   * Returns { email, workspace, brandKey, brand }.
   */
  function askInChat(logEl, esc, onPreview) {
    return new Promise((resolve) => {
      const st = { email: '', workspace: '', wsTouched: false, match: null, brand: 'none' };

      const row = document.createElement('div');
      row.className = 'bd-msg ai bd-setup-row';
      logEl.appendChild(row);

      function wsHint() {
        const m = st.match;
        if (!m) return 'We read the domain, not the inbox — try <b>nike.com</b>, <b>lumina.com</b>, or your own company.';
        if (m.personal) return `<b>${esc(m.domain)}</b> is a personal address, so there is no brand behind it. Carry on and the app stays unbranded.`;
        const b = BRANDS[m.key];
        return b.generated
          ? `Reading <b>${esc(m.domain)}</b> — the preview is wearing what we found.`
          : `Matched <b>${esc(b.name)}</b>. The preview is already wearing it.`;
      }

      function expansion() {
        if (st.brand === 'none') return '';
        const bb = BRANDS[st.brand];
        const sw = bb.swatches && bb.swatches.length ? bb.swatches : [bb.accent, bb.wash];
        return `<div class="exp">
          <span class="lbl">Read from ${esc(bb.site || bb.name)} — change any of it:</span>
          <div class="row">
            <span class="app-logo${bb.logo ? ' has-logo' : ''}" style="background:${esc(bb.accent)};color:${esc(bb.ink)}">${logoHtml(bb)}</span>
            <span class="swrow">${sw.map((hex) => `<button type="button" data-pick="${esc(hex)}" title="${esc(hex)}" class="${hex.toLowerCase() === bb.accent.toLowerCase() ? 'sel' : ''}" style="background:${esc(hex)}"></button>`).join('')}</span>
          </div>
          <div class="row"><span class="grow muted">Tone of voice</span><span>${esc(bb.tone)}</span></div>
          <div class="row"><span class="grow muted">Keep in sync with the site</span><button type="button" class="sw on" data-sync aria-pressed="true"><i></i></button></div>
        </div>`;
      }

      function html() {
        const ready = !!st.match && st.workspace.trim().length > 0;
        return `<div class="bd-setup-card clarify">
          <div>
            <div class="q">Set up your workspace</div>
            <div class="help">Your work email signs you in. The domain after the @ tells us whose brand the app should wear.</div>
          </div>
          <div class="wsfields">
            <div class="wsf">
              <label for="cemail">Work email</label>
              <div class="wsin">
                <input id="cemail" type="text" inputmode="email" spellcheck="false" placeholder="you@yourcompany.com" value="${esc(st.email)}" />
                <span class="dom">${st.match ? esc(st.match.domain) : ''}</span>
              </div>
            </div>
            <div class="wsf">
              <label for="cws">Workspace name</label>
              <div class="wsin"><input id="cws" type="text" spellcheck="false" placeholder="Your team" value="${esc(st.workspace)}" /></div>
            </div>
          </div>
          <div class="wshint">${wsHint()}</div>
          ${expansion()}
          <div class="cfoot">
            <span class="count">1 / 1</span>
            <button class="btn-skip" type="button" data-wsskip>Skip</button>
            <button class="btn-next" type="button" data-wsnext ${ready ? '' : 'disabled'}>Next</button>
          </div>
        </div>`;
      }

      function finish(skipped) {
        const brandKey = skipped ? 'none' : st.brand;
        const brand = setActive(brandKey, skipped ? '' : st.email);
        row.remove();
        if (typeof onPreview === 'function') onPreview();
        resolve({
          email: skipped ? '' : st.email,
          workspace: skipped ? '' : st.workspace.trim(),
          brandKey,
          brand,
        });
      }

      /* Re-render without losing the caret — the preview repaints on every
         keystroke, so the card is rebuilt on every keystroke too. */
      function paint(keepFocus) {
        const a = document.activeElement;
        const id = keepFocus && a && a.id;
        const pos = a && a.selectionStart;
        row.innerHTML = html();
        wire();
        if (id) {
          const el = row.querySelector(`#${id}`);
          if (el) {
            el.focus({ preventScroll: true });
            if (pos != null && el.setSelectionRange) el.setSelectionRange(pos, pos);
          }
        }
      }

      function sync() {
        setActive(st.brand, st.email);
        if (typeof onPreview === 'function') onPreview();
      }

      function wire() {
        const em = row.querySelector('#cemail');
        const ws = row.querySelector('#cws');

        em.addEventListener('input', () => {
          st.email = em.value;
          st.match = resolveBrand(st.email);
          st.brand = st.match && !st.match.personal && st.match.key ? st.match.key : 'none';
          /* The workspace name follows the brand until they name it themselves. */
          if (!st.wsTouched) st.workspace = st.brand === 'none' ? '' : BRANDS[st.brand].name;
          sync();
          paint(true);
        });

        ws.addEventListener('input', () => {
          st.wsTouched = true;
          st.workspace = ws.value;
          paint(true);
        });

        row.querySelectorAll('[data-pick]').forEach((btn) => {
          btn.addEventListener('click', () => {
            const b = BRANDS[st.brand];
            if (!b) return;
            b.accent = btn.dataset.pick;
            b.ink = inkFor(b.accent);
            sync();
            paint(false);
          });
        });

        const sw = row.querySelector('[data-sync]');
        if (sw) {
          sw.addEventListener('click', () => {
            const on = sw.classList.toggle('on');
            sw.setAttribute('aria-pressed', String(on));
          });
        }

        row.querySelector('[data-wsnext]').addEventListener('click', () => {
          if (st.match && st.workspace.trim()) finish(false);
        });
        row.querySelector('[data-wsskip]').addEventListener('click', () => finish(true));

        [em, ws].forEach((el) => el.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && st.match && st.workspace.trim()) finish(false);
        }));
      }

      paint(false);
      const first = row.querySelector('#cemail');
      if (first && document.activeElement === document.body) first.focus({ preventScroll: true });
    });
  }

  window.BrandMatch = {
    BRANDS,
    resolveBrand,
    getBrand,
    getActiveBrand: () => getBrand(activeKey),
    getActiveEmail: () => activeEmail,
    setActive,
    applyBrandVars,
    askInChat,
    logoHtml,
  };
})();
