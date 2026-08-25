/* ------------------------------------------------------------------
   /build — the prompt, carried.

   Somebody types what they want to build on the homepage and then meets
   four screens of account-making. If what they typed is not on screen
   the whole way, the box was a bait: they answer a Microsoft MFA
   challenge wondering whether their sentence survived, and arrive at the
   product expecting to type it again.

   So the prompt rides the query string, and every EAI page it passes
   through says it back:  Building: KYC onboarding for CommBank.

   One exception, and it is the same rule the harness half of this repo
   already follows. **Microsoft's sign-in page is Microsoft's.** We can no
   more put a strip across the top of it than we can put a banner inside
   Claude Code. So the prompt goes quiet for the two screens we do not
   own and comes back the moment we do — which is the honest shape, and
   is itself worth watching in a session: the moment a person is most
   likely to think they have lost it is the moment we cannot reassure
   them.

   Include it on our own pages only. Pages that should carry the value
   but draw nothing set `data-bd-strip="off"` on <body>.
------------------------------------------------------------------- */

(function () {
  const params = new URLSearchParams(window.location.search);
  const prompt = (params.get('prompt') || '').trim();

  /** Append the prompt (and anything else already carried) to a URL. */
  window.bdCarry = function bdCarry(url, extra) {
    const [path, existing] = String(url).split('?');
    const q = new URLSearchParams(existing || '');
    if (prompt) q.set('prompt', prompt);
    Object.entries(extra || {}).forEach(([k, v]) => { if (v) q.set(k, v); });
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };

  window.bdPrompt = prompt;
  if (!prompt) return;

  window.addEventListener('DOMContentLoaded', () => {
    // Every link that stays inside the prototype keeps the prompt. Doing it
    // here rather than in each page's markup means a page can be copied from
    // /signup unchanged and still not drop it.
    document.querySelectorAll('a[href$=".html"], a[href*=".html?"]').forEach((a) => {
      a.setAttribute('href', window.bdCarry(a.getAttribute('href')));
    });

    if (document.body.dataset.bdStrip === 'off') return;

    const strip = document.createElement('div');
    strip.className = 'bd-strip';
    strip.innerHTML = `
      <span class="bd-strip-spark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" fill="currentColor"/></svg>
      </span>
      <span class="bd-strip-k">Building</span>
      <span class="bd-strip-v"></span>
    `;
    strip.querySelector('.bd-strip-v').textContent = prompt;
    document.body.insertBefore(strip, document.body.firstChild);
    document.body.classList.add('has-bd-strip');
  });
})();
