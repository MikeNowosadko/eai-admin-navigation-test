/* ------------------------------------------------------------------
   Full-screen brand setup — signup then brand match, template-flow style.
   Lands from the marketing site with a prompt; exits to the builder
   once the brand is confirmed.
------------------------------------------------------------------- */

(function () {
  const BM = window.BrandMatch;
  if (!BM) return;

  const params = new URLSearchParams(location.search);
  const prompt = (window.bdPrompt || params.get('prompt') || 'a new business process').trim();
  const projectName = prompt.charAt(0).toUpperCase() + prompt.slice(1);
  const builderUrl = params.get('builder') || 'builder-brand-first.html';

  const SETUP_STEPS = ['Account', 'Brand', 'Personalise', 'Your data', 'Publish'];
  const ctx = `Building ${projectName}`;

  const state = {
    screen: 'signup',
    email: params.get('email') || '',
    match: null,
    brandKey: 'none',
    editColours: false,
  };

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function hexHue(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return 210;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    const mx = Math.max(r, g, b);
    const mn = Math.min(r, g, b);
    const d = mx - mn;
    if (!d) return 0;
    const h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return Math.round(h * 60);
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

  function setAccent(hex) {
    const b = BM.getBrand(state.brandKey);
    if (!b || b.key === 'none') return;
    b.accent = hex.toUpperCase();
    b.ink = inkFor(b.accent);
    b.swatches = b.swatches.slice();
    b.swatches[0] = b.accent;
    b.wash = hsl2hex(hexHue(b.accent), 34, 96);
    BM.setActive(state.brandKey, state.email);
    render();
  }

  function setupNav(n) {
    return `<div class="bs-snav">
      <a class="wm" href="${window.bdCarry ? window.bdCarry('index-brand-first.html') : 'index-brand-first.html'}">Enterprise<span>AI</span></a>
      <span class="bar"></span>
      <span class="ctx">${esc(ctx)}</span>
      <div class="bs-steps">
        ${SETUP_STEPS.map((t, i) => `<span class="${i + 1 === n ? 'on' : i + 1 < n ? 'did' : ''}">${i + 1} ${t}</span>`)
    .join('<i></i>')}
      </div>
    </div>`;
  }

  function matchHint(m) {
    if (!m) return 'We read the domain, not the inbox — try <b>lumina.com</b>, <b>nike.com</b>, or your company domain.';
    if (m.personal) return `<b>${esc(m.domain)}</b> is a personal address — the app stays unbranded.`;
    const b = BM.getBrand(m.key);
    return b.generated
      ? `We&rsquo;ll read <b>${esc(m.domain)}</b> and dress the app in what we find.`
      : `Found a match — <b>${esc(b.name)}</b>. Not you? Enter your website instead.`;
  }

  function brandLogo(b, size) {
    const px = size || 44;
    return `<span class="bs-blogo" style="background:${esc(b.accent)};width:${px}px;height:${px}px">${BM.logoHtml(b)}</span>`;
  }

  function swatches(b) {
    return b.swatches.map((hex) => {
      const inner = `<span class="sw" style="background:${esc(hex)}"></span><span class="hx mono">${esc(hex)}</span>`;
      return state.editColours
        ? `<button type="button" class="bs-swcell ${hex.toLowerCase() === b.accent.toLowerCase() ? 'sel' : ''}" data-pick="${esc(hex)}">${inner}</button>`
        : `<span class="bs-swcell">${inner}</span>`;
    }).join('');
  }

  function signupHtml() {
    const m = state.match;
    return `<div class="bs-setup">
      ${setupNav(1)}
      <div class="bs-sbody"><div class="bs-sinner"><div class="bs-sform">
        <div class="bs-eyebrow">Step 1 of 5</div>
        <h1 class="bs-sh1">Who is this for?</h1>
        <p class="bs-slede">Your work email is all we need. It creates your account, and the bit after the @ tells us whose brand to dress the app in.</p>
        <label class="bs-flabel" for="wemail">Work email</label>
        <div class="bs-efield">
          <input id="wemail" type="text" inputmode="email" autocomplete="email" spellcheck="false" placeholder="you@yourcompany.com" value="${esc(state.email)}" />
          <span class="dom" id="domhint">${m ? esc(m.domain) : ''}</span>
        </div>
        <div class="bs-shint" id="emailhint">${matchHint(m)}</div>
        <div class="bs-srow">
          <button type="button" class="bs-btn-primary bs-btn-lg" id="sgo" ${m ? '' : 'disabled'}>Continue to brand match</button>
        </div>
        <button type="button" class="bs-btn-link" data-unbranded>Skip — stay unbranded</button>
      </div></div></div>
    </div>`;
  }

  function brandmatchHtml() {
    const b = BM.getBrand(state.brandKey);
    const titleSize = b.name.length > 12 ? ' style="font-size:40px;line-height:44px"' : '';
    return `<div class="bs-setup">
      ${setupNav(2)}
      <div class="bs-sbody"><div class="bs-sinner"><div class="bs-bm">
        <div class="bs-eyebrow">Step 2 of 5</div>
        <h1 class="bs-sh1"${titleSize}>This is ${esc(b.name)}, right?</h1>
        <p class="bs-slede">Pulled from ${esc(b.site || b.name)} a moment ago. Change anything that looks off — everything the app builds will use these.</p>
        <div class="bs-bcard">
          <div class="bs-bhead">
            ${brandLogo(b)}
            <div><div class="nm">${esc(b.name)}</div><div class="st">${esc(b.sector)} &middot; ${esc(b.site)}</div></div>
            <span class="bs-pill-read">Read by context.dev</span>
          </div>
          <div style="margin-top:20px">
            <span class="bs-klbl">Colours</span>
            <div class="bs-swgrid">${swatches(b)}</div>
          </div>
          ${state.editColours ? `<div class="bs-picker">
            <input type="color" class="ci" id="cpick" value="${esc(b.accent)}" />
            <span class="cx">Pick any colour — the app will wear the first swatch.</span>
          </div>` : ''}
          <div class="bs-meta2">
            <div><span class="bs-klbl">Typeface</span><div class="v">${esc(b.type)}</div></div>
            <div><span class="bs-klbl">Tone of voice</span><div class="v">${esc(b.tone)}</div></div>
          </div>
        </div>
        <div class="bs-srow">
          <button type="button" class="bs-btn-primary bs-btn-lg" data-usebrand>Use this brand &mdash; open the editor</button>
          <button type="button" class="bs-btn-second" data-editcolours>${state.editColours ? 'Done editing' : 'Edit colours'}</button>
        </div>
        <button type="button" class="bs-btn-link" data-back>Try a different email</button>
      </div></div></div>
    </div>`;
  }

  function render() {
    const root = $('screen');
    if (!root) return;
    root.innerHTML = state.screen === 'brandmatch' ? brandmatchHtml() : signupHtml();
    wire();
  }

  function goBuilder(key) {
    const b = BM.getBrand(key);
    BM.setActive(key, state.email);
    sessionStorage.setItem('build-sugar-enter', '1');
    const href = window.bdCarry(builderUrl, {
      email: state.email,
      brand: key,
      ws: b.name,
      flow: 'brand-first',
    });
    location.href = href;
  }

  function continueFromEmail() {
    const m = state.match;
    if (!m) return;
    if (m.personal) {
      goBuilder('none');
      return;
    }
    state.brandKey = m.key;
    state.editColours = false;
    BM.setActive(m.key, state.email);
    state.screen = 'brandmatch';
    render();
  }

  function wire() {
    const input = $('wemail');
    if (input) {
      const sync = () => {
        state.email = input.value;
        state.match = BM.resolveBrand(state.email);
        const dom = $('domhint');
        const hint = $('emailhint');
        const go = $('sgo');
        if (dom) dom.textContent = state.match ? state.match.domain : '';
        if (hint) hint.innerHTML = matchHint(state.match);
        if (go) go.disabled = !state.match;
      };
      input.addEventListener('input', sync);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && state.match) {
          e.preventDefault();
          continueFromEmail();
        }
      });
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      sync();
    }

    document.querySelectorAll('[data-unbranded]').forEach((el) => {
      el.addEventListener('click', () => goBuilder('none'));
    });

    const go = $('sgo');
    if (go) go.addEventListener('click', continueFromEmail);

    document.querySelectorAll('[data-usebrand]').forEach((el) => {
      el.addEventListener('click', () => goBuilder(state.brandKey));
    });

    document.querySelectorAll('[data-editcolours]').forEach((el) => {
      el.addEventListener('click', () => {
        state.editColours = !state.editColours;
        render();
      });
    });

    document.querySelectorAll('[data-pick]').forEach((el) => {
      el.addEventListener('click', () => setAccent(el.dataset.pick));
    });

    document.querySelectorAll('[data-back]').forEach((el) => {
      el.addEventListener('click', () => {
        state.screen = 'signup';
        render();
      });
    });

    const cp = $('cpick');
    if (cp) {
      cp.addEventListener('input', () => setAccent(cp.value));
      cp.addEventListener('change', () => {
        setAccent(cp.value);
        render();
      });
    }
  }

  if (state.email) state.match = BM.resolveBrand(state.email);
  if (params.get('screen') === 'brandmatch' && state.match && !state.match.personal) {
    state.brandKey = state.match.key;
    state.screen = 'brandmatch';
    BM.setActive(state.brandKey, state.email);
  }

  render();
})();
