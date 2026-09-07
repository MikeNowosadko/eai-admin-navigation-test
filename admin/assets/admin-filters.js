/* ------------------------------------------------------------------
   Submissions toolbar — date range popover + export format menu.
------------------------------------------------------------------- */

(function () {
  const MONTHS = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };

  /** Prototype clock — seeded submissions use 2026. */
  const TODAY = new Date(2026, 8, 2);

  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function iso(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function parseAt(at, year = TODAY.getFullYear()) {
    const m = String(at).match(/^(\d{1,2}) (\w+),/);
    if (!m) return null;
    const mon = MONTHS[m[2]];
    if (mon === undefined) return null;
    return new Date(year, mon, +m[1]);
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function addDays(d, n) {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  }

  function fmtShort(d) {
    return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  }

  function chev() {
    return `<span class="ad-ico-chev">${window.adIcon('chev')}</span>`;
  }

  function setBtnLabel(btn, from, to, preset) {
    btn.innerHTML = `${window.adIcon('calendar')}${rangeLabel(from, to, preset)}${chev()}`;
  }

  function rangeLabel(from, to, preset) {
    if (preset === 'today') return 'Today';
    if (preset === '7') return 'Last 7 days';
    if (preset === '30') return 'Last 30 days';
    if (iso(from) === iso(to)) return fmtShort(from);
    return `${fmtShort(from)} – ${fmtShort(to)}`;
  }

  function presetRange(preset) {
    const end = startOfDay(TODAY);
    if (preset === 'today') return { from: end, to: end, preset: 'today' };
    if (preset === '7') return { from: addDays(end, -6), to: end, preset: '7' };
    return { from: addDays(end, -29), to: end, preset: '30' };
  }

  function inRange(date, from, to) {
    if (!date) return true;
    const t = startOfDay(date).getTime();
    return t >= startOfDay(from).getTime() && t <= startOfDay(to).getTime();
  }

  function bindDateRange({ wrap, btn, pop, fromInput, toInput, onApply }) {
    if (!wrap || !btn || !pop) return null;

    let state = presetRange('30');

    function syncInputs() {
      if (fromInput) fromInput.value = iso(state.from);
      if (toInput) toInput.value = iso(state.to);
      pop.querySelectorAll('[data-preset]').forEach((el) => {
        el.classList.toggle('on', el.dataset.preset === state.preset);
      });
    }

    function setLabel() {
      setBtnLabel(btn, state.from, state.to, state.preset);
    }

    function apply(next, silent) {
      state = next;
      syncInputs();
      setLabel();
      if (!silent) onApply(state);
    }

    function open() {
      pop.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      wrap.dataset.open = 'true';
    }

    function close() {
      pop.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      wrap.dataset.open = 'false';
    }

    btn.innerHTML = `${window.adIcon('calendar')}Last 30 days${chev()}`;
    syncInputs();
    setLabel();

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (pop.hidden) open();
      else close();
    });

    pop.querySelectorAll('[data-preset]').forEach((el) => {
      el.addEventListener('click', () => {
        apply(presetRange(el.dataset.preset));
        close();
      });
    });

    pop.querySelector('[data-range-apply]')?.addEventListener('click', () => {
      const from = fromInput?.valueAsDate;
      const to = toInput?.valueAsDate;
      if (!from || !to) return;
      const a = startOfDay(from);
      const b = startOfDay(to);
      apply({
        from: a <= b ? a : b,
        to: a <= b ? b : a,
        preset: '',
      });
      close();
    });

    pop.querySelector('[data-range-clear]')?.addEventListener('click', () => {
      apply(presetRange('30'));
      close();
    });

    fromInput?.addEventListener('change', () => {
      pop.querySelectorAll('[data-preset]').forEach((el) => el.classList.remove('on'));
      state = { ...state, preset: '' };
    });
    toInput?.addEventListener('change', () => {
      pop.querySelectorAll('[data-preset]').forEach((el) => el.classList.remove('on'));
      state = { ...state, preset: '' };
    });

    const onDoc = (e) => {
      if (!wrap.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);

    return {
      get: () => state,
      matches: (at) => inRange(parseAt(at), state.from, state.to),
      teardown: () => {
        document.removeEventListener('click', onDoc);
        document.removeEventListener('keydown', onKey);
      },
    };
  }

  function bindExport({ wrap, btn, menu, onExport }) {
    if (!wrap || !btn || !menu) return null;

    function close() {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      wrap.dataset.open = 'false';
    }

    function open() {
      menu.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
      wrap.dataset.open = 'true';
    }

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menu.hidden) open();
      else close();
    });

    menu.querySelectorAll('[data-export]').forEach((el) => {
      el.addEventListener('click', () => {
        close();
        onExport(el.dataset.export);
      });
    });

    const onDoc = (e) => {
      if (!wrap.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };

    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);

    return {
      teardown: () => {
        document.removeEventListener('click', onDoc);
        document.removeEventListener('keydown', onKey);
      },
    };
  }

  window.AD_FILTERS = { parseAt, bindDateRange, bindExport };
})();
