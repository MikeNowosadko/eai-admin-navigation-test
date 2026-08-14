/* ------------------------------------------------------------------
   The terminal runtime: everything a journey needs to print, ask and
   wait, with none of the journey in it.

   Loaded after desktop.js and before whichever journey file a flow
   uses (terminal.js for the npx flow, cli.js for the CLI flow), so a
   journey is just a readable async function calling these.

     out / gap / tick / banner / progress   print
     confirmKey / ask / choose              wait for the user
     inBrowser                              hand off to Safari and back
------------------------------------------------------------------- */

const body = document.getElementById('termBody');

/* --- fast forward --------------------------------------------------- */

let fastForward = false;
body.addEventListener('click', (e) => {
  // Clicking empty terminal space skips ahead; clicking a control does not.
  if (e.target.closest('.chip, .opt, input')) return;
  fastForward = true;
  const input = body.querySelector('.tin input');
  if (input) input.focus();
});

function sleep(ms) {
  return new Promise((resolve) => {
    if (fastForward) return resolve();
    const t = setTimeout(resolve, ms);
    const poll = setInterval(() => {
      if (fastForward) { clearTimeout(t); clearInterval(poll); resolve(); }
    }, 40);
    setTimeout(() => clearInterval(poll), ms + 60);
  });
}

/* --- printing -------------------------------------------------------- */

function scroll() { body.scrollTop = body.scrollHeight; }

function el(tag, cls, html) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html != null) node.innerHTML = html;
  body.appendChild(node);
  scroll();
  return node;
}

/** Print a line, then pause briefly so output feels like it's streaming. */
async function out(text, cls = '', pause = 90) {
  el('span', `ln ${cls}`.trim(), text);
  await sleep(pause);
}

async function gap() { el('span', 'ln spacer'); }

async function tick(text) { await out(`  ✓ ${text}`, 'ok', 150); }

async function banner() {
  el('span', 'ln banner',
`  ███████  █████  ██
  ██      ██   ██ ██
  █████   ███████ ██
  ██      ██   ██ ██
  ███████ ██   ██ ██`);
  await sleep(200);
}

/** Fake work with a progress bar. */
async function progress(label, ms) {
  const row = el('span', 'ln progress', `  ${label} <span class="bar"><i></i></span> <em class="pct" style="font-style:normal;color:#767d8a"></em>`);
  const fill = row.querySelector('i');
  const pct = row.querySelector('.pct');
  const steps = 24;
  for (let i = 1; i <= steps; i += 1) {
    if (!fastForward) await new Promise((r) => setTimeout(r, ms / steps));
    fill.style.width = `${(i / steps) * 100}%`;
    pct.textContent = `${Math.round((i / steps) * 100)}%`;
  }
  row.innerHTML = `  <span style="color:#4ade80">✓</span> ${label} <span style="color:#767d8a">— done</span>`;
  scroll();
  await sleep(120);
}

/* --- waiting for the user -------------------------------------------- */

/** Single-keystroke confirm, e.g. "Ok to proceed? (y)" or "press enter". */
async function confirmKey(label, key, chipText) {
  fastForward = false;
  const row = el('span', 'ln');
  row.innerHTML = label ? `${label} ` : '  ';
  const chip = document.createElement('button');
  chip.className = 'chip primary';
  chip.textContent = chipText || `press ${key}`;
  row.appendChild(chip);
  scroll();
  await new Promise((resolve) => {
    const done = () => { document.removeEventListener('keydown', onKey); resolve(); };
    const onKey = (e) => {
      if (e.key === key || e.key.toLowerCase() === key.toLowerCase()) { e.preventDefault(); done(); }
    };
    chip.addEventListener('click', done);
    document.addEventListener('keydown', onKey);
  });
  const shown = key === 'Enter' ? '⏎' : key;
  row.innerHTML = label ? `${label} <span class="user">${shown}</span>` : `  <span class="user">${shown}</span>`;
}

/**
 * Prompt for text. Supports real typing, real paste, and shortcut chips
 * (a chip types its value into the prompt, so the terminal still feels live).
 */
function ask({ prefix = '❯', label, placeholder = '', chips = [], validate }) {
  fastForward = false;
  if (label) el('span', 'ln head', `  ${label}`);

  const row = el('span', 'ln tin');
  row.innerHTML = `<span class="pfx">${prefix}</span>`;
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.autocomplete = 'off';
  input.spellcheck = false;
  row.appendChild(input);
  input.focus();

  let chipRow = null;
  if (chips.length) {
    chipRow = el('span', 'ln chips');
    chips.forEach((c) => {
      const b = document.createElement('button');
      b.className = `chip${c.primary ? ' primary' : ''}`;
      b.textContent = c.label;
      // A chip value can be a function, for things resolved at click time
      // (the clipboard, say). Long multi-line text lands as one paste — an
      // <input> would strip the newlines out of it.
      b.addEventListener('click', () => {
        const value = typeof c.value === 'function' ? c.value() : c.value;
        if (value.length > 120 || value.includes('\n')) {
          input.value = `${value.split('\n')[0]} …`;
          setTimeout(() => finish(value), 280);
        } else {
          typeInto(input, value).then(submit);
        }
      });
      chipRow.appendChild(b);
    });
  }
  scroll();

  let resolveWith;
  const promise = new Promise((r) => { resolveWith = r; });

  function submit() { finish(input.value.trim()); }

  function finish(value) {
    if (!value) return;
    if (validate) {
      const problem = validate(value);
      if (problem) {
        // Freeze the bad attempt, print the error, and ask again in place.
        const bad = document.createElement('span');
        bad.className = 'ln';
        bad.innerHTML = `<span class="pfx">${prefix}</span> <span class="user">${escapeHtml(value)}</span>`;
        row.parentNode.insertBefore(bad, row);
        const err = document.createElement('span');
        err.className = 'ln err';
        err.textContent = problem;
        row.parentNode.insertBefore(err, row);
        input.value = '';
        scroll();
        return;
      }
    }
    row.outerHTML = `<span class="ln"><span class="pfx">${prefix}</span> <span class="user">${escapeHtml(value)}</span></span>`;
    if (chipRow) chipRow.remove();
    scroll();
    resolveWith(value);
  }

  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
  return promise;
}

/**
 * Type text into an input character by character. Anything long — a pasted
 * setup prompt, say — lands in one go, the way a real paste does.
 */
function typeInto(input, text) {
  input.focus();
  input.value = '';
  if (text.length > 120) {
    input.value = text;
    return new Promise((resolve) => setTimeout(resolve, 260));
  }
  return new Promise((resolve) => {
    let i = 0;
    const tick = () => {
      input.value = text.slice(0, i += 1);
      if (i >= text.length) return setTimeout(resolve, 120);
      setTimeout(tick, text.length > 40 ? 9 : 18);
    };
    tick();
  });
}

/** Chip-only decision point (approve / feedback / open something). */
function choose(options, { sticky = [] } = {}) {
  fastForward = false;
  const chipRow = el('span', 'ln chips');
  return new Promise((resolve) => {
    options.forEach((o) => {
      const b = document.createElement('button');
      b.className = `chip${o.primary ? ' primary' : ''}`;
      b.textContent = o.label;
      b.addEventListener('click', () => {
        if (sticky.includes(o.value)) { resolve(o.value); return; }
        chipRow.outerHTML = `<span class="ln"><span class="pfx">❯</span> <span class="user">${escapeHtml(o.label)}</span></span>`;
        scroll();
        resolve(o.value);
      });
      chipRow.appendChild(b);
    });
    scroll();
  });
}

/* --- handing off to the browser --------------------------------------- */

/** Send the user to the browser, wait for them to finish, bring them back. */
async function inBrowser(url, action, coachTitle, coachText) {
  browser.go(url);
  coach(coachTitle, coachText);
  const data = await browser.waitFor(action);
  hideCoach();
  focusWin('host');
  await sleep(220);
  return data;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
