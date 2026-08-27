(function () {
  const CMD = 'npx install eai';
  const SIGNUP_URL = '../../build/pages/signup.html';

  document.querySelectorAll('[data-build-root]').forEach((root) => {
    const form = root.querySelector('[data-build-form]');
    const input = root.querySelector('[data-build-input]');
    if (!form || !input) return;

    function start() {
      const v = input.value.trim();
      if (!v) { input.focus(); return; }
      window.location.href = `${SIGNUP_URL}?prompt=${encodeURIComponent(v)}`;
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      start();
    });

    root.querySelectorAll('[data-build-chip]').forEach((chip) => {
      chip.addEventListener('click', () => {
        input.value = chip.textContent.trim();
        input.focus();
      });
    });
  });

  document.querySelectorAll('[data-copy-root]').forEach((root) => {
    const field = root.querySelector('[data-copy-field]');
    const btn = root.querySelector('[data-copy-btn]');
    const note = root.querySelector('[data-copy-note]');
    const hint = root.querySelector('[data-copy-hint]');
    if (!field) return;

    async function copy() {
      try { await navigator.clipboard.writeText(CMD); } catch (_) {}
      field.classList.add('copied');
      if (hint) hint.textContent = 'copied';
      if (note) note.innerHTML = '<strong>Copied.</strong> Open your terminal and paste it — we\'ll take it from there.';
      setTimeout(() => {
        field.classList.remove('copied');
        if (hint) hint.textContent = 'click to copy';
      }, 2600);
    }

    field.addEventListener('click', copy);
    if (btn) btn.addEventListener('click', copy);
  });

  document.querySelectorAll('[data-carousel]').forEach((section) => {
    const slides = Array.from(section.querySelectorAll('[data-slide]'));
    const dots = Array.from(section.querySelectorAll('[data-carousel-dot]'));
    const titleEl = section.querySelector('[data-carousel-title]');
    const descEl = section.querySelector('[data-carousel-desc]');
    const titleElMobile = section.querySelector('[data-carousel-title-mobile]');
    const descElMobile = section.querySelector('[data-carousel-desc-mobile]');

    function show(i) {
      slides.forEach((slide) => {
        const on = Number(slide.dataset.slideIndex) === i;
        slide.classList.toggle('active', on);
        const video = slide.querySelector('video');
        if (video) {
          if (on) { video.currentTime = 0; video.play().catch(() => {}); }
          else video.pause();
        }
      });
      dots.forEach((dot) => {
        const on = Number(dot.dataset.slideIndex) === i;
        dot.classList.toggle('active', on);
        dot.setAttribute('aria-current', on ? 'true' : 'false');
      });
      const ref = slides.find((s) => Number(s.dataset.slideIndex) === i);
      const title = ref?.dataset.title || '';
      const desc = ref?.dataset.desc || '';
      if (titleEl) titleEl.textContent = title;
      if (descEl) descEl.textContent = desc;
      if (titleElMobile) titleElMobile.textContent = title;
      if (descElMobile) descElMobile.textContent = desc;
    }

    dots.forEach((dot) => dot.addEventListener('click', () => show(Number(dot.dataset.slideIndex))));
    show(0);
  });

  document.querySelectorAll('.faq-q').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const open = item.classList.contains('open');
      item.parentElement.querySelectorAll('.faq-item').forEach((i) => i.classList.remove('open'));
      if (!open) item.classList.add('open');
    });
  });
})();
