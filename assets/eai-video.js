/* ------------------------------------------------------------------
   "Watch what happens next" — the same 28 seconds, in two places.

   An external harness opens empty and we cannot write a word into it,
   so the last thing a person reads is whatever we showed them before
   they left. This is the second attempt at saying it: a still
   instruction, and then a moving one for anyone the still one lost.

   It plays **in place, at full size**. The first version was a 116px
   thumbnail that opened a lightbox, which is two bets against itself:
   a small target asks to be skipped, and a modal asks permission to
   take over the screen. The player is now the size it will be when it
   is running, whether or not anyone has pressed it — the thing looks
   like a video sitting there waiting, because that is what it is.

   Whether anyone presses play is the measurement. Every play, finish
   and replay is logged to window.EAI_VIDEO_LOG and echoed to the
   console, so a moderator can read it back without instrumenting a
   real analytics pipeline.

   It is drawn rather than filmed: a fake window, a caret, a command
   typing itself. A real screen recording would date the moment any of
   these tools changes its chrome, and this has to survive that.
------------------------------------------------------------------- */

(function () {
  const SCRIPT = [
    { at: 0, caption: 'Your app opens in your AI tool — empty.' },
    { at: 1500, caption: 'Type /eai at the prompt.', type: '/eai' },
    { at: 4200, caption: 'Press enter.', enter: true },
    { at: 5200, caption: "That's it — EAI takes over from there.", done: true },
  ];

  const TOTAL = 6400;
  const IDLE = 'Watch what happens next · 28 seconds';

  const log = [];
  window.EAI_VIDEO_LOG = log;

  function record(event, where) {
    const entry = { event, where, at: new Date().toISOString() };
    log.push(entry);
    // eslint-disable-next-line no-console
    console.log('[eai-video]', event, where);
    // The desktop shell hears this too, when we're inside the browser frame.
    if (typeof tell === 'function') tell({ action: 'video', data: entry });
  }

  const MARKUP = `
    <div class="eai-vid-stage">
      <div class="eai-vid-win">
        <div class="eai-vid-bar"><i></i><i></i><i></i><span class="eai-vid-title"></span></div>
        <div class="eai-vid-body">
          <span class="eai-vid-line"><em>&#10095;</em><b class="eai-vid-typed"></b><s class="eai-vid-caret"></s></span>
          <span class="eai-vid-ok" hidden>&#10003; EAI is running. Tell it what you want to build.</span>
        </div>
      </div>
      <button class="eai-vid-play" type="button" aria-label="Play">
        <svg viewBox="0 0 24 24" fill="none"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>
      </button>
    </div>
    <div class="eai-vid-ft">
      <span class="eai-vid-caption"></span>
      <div class="eai-vid-track"><i></i></div>
    </div>`;

  /**
   * Turn a container into an inline player.
   * `where` is only a label for the log: 'webapp' or 'setup-app'.
   */
  function mountVideo(el, where) {
    el.classList.add('eai-vid');
    el.innerHTML = MARKUP;

    const stage = el.querySelector('.eai-vid-stage');
    const title = el.querySelector('.eai-vid-title');
    const typed = el.querySelector('.eai-vid-typed');
    const caret = el.querySelector('.eai-vid-caret');
    const ok = el.querySelector('.eai-vid-ok');
    const play = el.querySelector('.eai-vid-play');
    const caption = el.querySelector('.eai-vid-caption');
    const progress = el.querySelector('.eai-vid-track i');

    // The window in the film is the one they are about to be handed to.
    title.textContent = el.dataset.app
      ? `${el.dataset.app} — ${el.dataset.project || 'your app'}`
      : 'Claude Code — contract-renewals';

    caption.textContent = IDLE;

    let timers = [];
    let tick = null;

    function reset() {
      timers.forEach(clearTimeout);
      timers = [];
      clearInterval(tick);
      typed.textContent = '';
      caret.hidden = false;
      caret.classList.remove('flash');
      ok.hidden = true;
      progress.style.width = '0%';
      caption.textContent = IDLE;
      stage.classList.remove('playing');
      play.classList.remove('replay');
      play.setAttribute('aria-label', 'Play');
    }

    function run() {
      record(play.classList.contains('replay') ? 'replay' : 'play', where);
      reset();
      stage.classList.add('playing');

      const started = Date.now();
      tick = setInterval(() => {
        const p = Math.min(1, (Date.now() - started) / TOTAL);
        progress.style.width = `${p * 100}%`;
        if (p === 1) clearInterval(tick);
      }, 60);

      SCRIPT.forEach((beat) => {
        timers.push(setTimeout(() => {
          caption.textContent = beat.caption;

          if (beat.type) {
            // typed one letter at a time, which is the whole point of showing it
            [...beat.type].forEach((ch, i) => {
              timers.push(setTimeout(() => { typed.textContent += ch; }, i * 260));
            });
          }
          if (beat.enter) caret.classList.add('flash');
          if (beat.done) {
            caret.hidden = true;
            ok.hidden = false;
            record('finished', where);
            // Back to a play button, so watching it twice is one click.
            stage.classList.remove('playing');
            play.classList.add('replay');
            play.setAttribute('aria-label', 'Watch again');
          }
        }, beat.at));
      });
    }

    play.addEventListener('click', run);
    // The whole frame is the target while it is idle — a 116px thumbnail
    // was the reason nobody pressed the last one.
    stage.addEventListener('click', (e) => {
      if (e.target.closest('.eai-vid-play')) return;
      if (stage.classList.contains('playing')) return;
      run();
    });
  }

  window.mountVideo = mountVideo;

  // Anything marked up front gets wired without the page having to ask.
  window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-video]').forEach((el) => mountVideo(el, el.dataset.video));
  });
}());
