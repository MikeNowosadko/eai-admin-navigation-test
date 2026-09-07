(() => {
  const experience = new URLSearchParams(location.search).get('experience');
  if (experience === 'sugar' || experience === 'full') {
    document.querySelectorAll('a[href="index-chat-first.html"]').forEach(link => {
      link.href = `index-chat-first.html?experience=${experience}`;
    });
  }
  const input = document.getElementById('mktPrompt');
  if (!input) return;

  const examples = [
    'Build an app that manages my KYC onboarding...',
    'Build an app that manages my invoice processing...',
    'Build an app that manages my leave approval...',
  ];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let example = 0;
  let length = 0;
  let deleting = false;
  let timer;

  function type() {
    if (input.value || document.activeElement === input || document.hidden || reducedMotion.matches) return;
    const text = examples[example];
    length += deleting ? -1 : 1;
    input.placeholder = text.slice(0, length);
    let delay = deleting ? 25 : 65;
    if (length === text.length) {
      deleting = true;
      delay = 2000;
    } else if (length === 0) {
      deleting = false;
      example = (example + 1) % examples.length;
      delay = 350;
    }
    timer = window.setTimeout(type, delay);
  }

  function reset() {
    window.clearTimeout(timer);
    input.placeholder = examples[example];
    length = 0;
    deleting = false;
    if (!input.value && document.activeElement !== input && !document.hidden && !reducedMotion.matches) {
      input.placeholder = '';
      timer = window.setTimeout(type, 350);
    }
  }

  input.addEventListener('focus', reset);
  input.addEventListener('input', reset);
  input.addEventListener('blur', reset);
  document.querySelectorAll('[data-sample-prompt]').forEach((card) => {
    card.addEventListener('click', () => {
      input.value = card.dataset.samplePrompt;
      input.focus();
      reset();
    });
  });
  document.addEventListener('visibilitychange', reset);
  reducedMotion.addEventListener('change', reset);
  window.addEventListener('pageshow', reset);
  window.addEventListener('pagehide', () => window.clearTimeout(timer));
  reset();
})();
