/* ------------------------------------------------------------------
   Analytics — ported from eainocodebuilder.

   Source of truth for the model and the geometry:
     src/lib/analytics/step-health.ts        thresholds + labels
     src/lib/analytics/format-time.ts        Xm / Xh Ym
     src/components/dashboard/conversion-funnel.tsx    the funnel
     src/components/dashboard/step-analytics-table.tsx the table view
     src/components/dashboard/attention-banner.tsx     the triage banner
     src/components/dashboard/recommended-fixes.tsx    the fix list

   Everything here is derived from one array of StepMetric:

     { stepIndex, stepTitle, entries, completions, dropOffRate,
       averageTimeMinutes }

   The KPIs, the banner, the funnel, the table and the fix list all read
   that same array, so the dashboard cannot contradict itself — which is
   the whole reason the real code centralises the thresholds.
------------------------------------------------------------------- */

window.ADANALYTICS = (function () {
  /* --- step-health.ts ------------------------------------------- */
  const HEALTH_CRITICAL_THRESHOLD = 15;
  const HEALTH_WARNING_THRESHOLD = 10;

  function healthOf(dropOffRate) {
    if (dropOffRate > HEALTH_CRITICAL_THRESHOLD) return 'critical';
    if (dropOffRate > HEALTH_WARNING_THRESHOLD) return 'warning';
    return 'healthy';
  }

  const HEALTH_LABEL = { healthy: 'Healthy', warning: 'At risk', critical: 'Critical' };

  /* --- format-time.ts ------------------------------------------- */
  function formatTime(minutes) {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  /* --- deriving StepMetric from a funnel -------------------------
     `entries` is how many reached each step; `completed` is how many
     finished the last one. Completions for every other step are the
     entries of the step after it, which is what makes the drop-off
     rates add up down the funnel. Same shape as computeStepMetrics()
     in src/lib/mock/analytics-data.ts.                             */
  function stepMetrics(steps, entries, completed, times) {
    return steps.map((title, i) => {
      const inn = entries[i];
      const out = i === steps.length - 1 ? completed : entries[i + 1];
      const drop = inn > 0 ? ((inn - out) / inn) * 100 : 0;
      return {
        stepIndex: i,
        stepTitle: title,
        entries: inn,
        completions: out,
        dropOffRate: Math.round(drop * 10) / 10,
        averageTimeMinutes: times[i],
      };
    });
  }

  /** Headline numbers, read off the funnel rather than stored beside it. */
  function summary(m) {
    if (!m.length) return { total: 0, completed: 0, completionRate: 0, avgMinutes: 0 };
    const total = m[0].entries;
    const completed = m[m.length - 1].completions;
    return {
      total,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgMinutes: m.reduce((a, s) => a + s.averageTimeMinutes, 0),
    };
  }

  /* --- attention-banner.tsx ------------------------------------- */
  function attention(m) {
    const needs = m.filter((s) => healthOf(s.dropOffRate) !== 'healthy');
    const leak = needs.reduce((worst, s) => (!worst || s.dropOffRate > worst.dropOffRate ? s : worst), null);
    if (!leak) return null;
    return {
      count: needs.length,
      leak,
      title: needs.length === 1 ? '1 step needs attention' : `${needs.length} steps need attention`,
      body: `“${leak.stepTitle}” is losing ${leak.dropOffRate.toFixed(1)}% of users before they finish — the workflow’s biggest leak.`,
    };
  }

  /* --- recommended-fixes.tsx ------------------------------------ */
  function fixes(m, threshold = 5, limit = 3) {
    return m
      .filter((s) => s.dropOffRate >= threshold)
      .sort((a, b) => b.dropOffRate - a.dropOffRate)
      .slice(0, limit);
  }

  /* --- conversion-funnel.tsx ------------------------------------
     Geometry is the original's, in px: 56 tall pills, 18 apart, and
     connector walls that reach 12px behind the pills above and below
     so their square corners hide under the pills' rounded ones. Pill
     width is exactly proportional to retention, with an 18% floor so
     a badly-leaking step is still readable.                        */
  const PILL_H = 56;
  const GAP = 18;
  const WALL_OVERLAP = 12;
  const MIN_WIDTH = 18;

  function rowsOf(m) {
    const total = m.length ? m[0].entries : 0;
    return m.map((s) => {
      const retention = total > 0 ? s.entries / total : 0;
      const widthPct = Math.max(retention * 100, MIN_WIDTH);
      return {
        ...s,
        retentionPct: Math.round(retention * 100),
        widthPct,
        half: widthPct / 2,
        health: healthOf(s.dropOffRate),
      };
    });
  }

  function healthMark(health) {
    if (health === 'healthy') return '<span class="ad-hm dot" aria-label="Healthy"></span>';
    return `<span class="ad-hm ${health}"><i></i>${HEALTH_LABEL[health]}</span>`;
  }

  function funnelHTML(m) {
    const rows = rowsOf(m);
    const n = rows.length;
    if (!n) return '<div class="ad-empty">No step data yet.</div>';
    const totalH = n * PILL_H + (n - 1) * GAP;

    const walls = rows.slice(0, -1).map((r, i) => {
      const next = rows[i + 1];
      const yt = i * (PILL_H + GAP) + PILL_H - WALL_OVERLAP;
      const yb = (i + 1) * (PILL_H + GAP) + WALL_OVERLAP;
      return `<polygon points="${50 - r.half},${yt} ${50 + r.half},${yt} ${50 + next.half},${yb} ${50 - next.half},${yb}" fill="currentColor" fill-opacity="0.05" />`;
    }).join('');

    const pills = rows.map((r) => `
      <div class="ad-fn-pill" data-step="${r.stepIndex}" style="width:${r.widthPct}%;height:${PILL_H}px;">
        <span class="t">${r.stepTitle}</span>
        <span class="m">${r.entries.toLocaleString()} · ${r.retentionPct}%${healthMark(r.health)}</span>
      </div>`).join('');

    return `<div class="ad-fn">
      <div class="ad-fn-plot">
        <svg viewBox="0 0 100 ${totalH}" preserveAspectRatio="none" aria-hidden="true"><g>${walls}</g></svg>
        <div class="ad-fn-pills" style="gap:${GAP}px;">${pills}</div>
      </div>
      <div class="ad-fn-legend">
        <span class="ad-hm dot"></span>Healthy
        <span class="ad-hm warning"><i></i>At risk</span>
        <span class="ad-hm critical"><i></i>Critical</span>
      </div>
    </div>`;
  }

  /* --- step-analytics-table.tsx --------------------------------- */
  function tableHTML(m) {
    if (!m.length) return '<div class="ad-empty">No step data yet.</div>';
    let worst = 0;
    m.forEach((s, i) => { if (s.dropOffRate > m[worst].dropOffRate) worst = i; });
    return `<table class="ad-steps">
      <thead><tr>
        <th>Step</th><th class="n">Entries</th><th class="n">Completions</th>
        <th class="n">Drop-off rate</th><th class="n">Avg time</th>
      </tr></thead>
      <tbody>${m.map((s, i) => `
        <tr class="${i === worst ? 'worst' : ''}">
          <td class="s">${s.stepTitle}</td>
          <td class="n">${s.entries.toLocaleString()}</td>
          <td class="n">${s.completions.toLocaleString()}</td>
          <td class="n h-${healthOf(s.dropOffRate)}">${s.dropOffRate.toFixed(1)}%</td>
          <td class="n">${formatTime(s.averageTimeMinutes)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
  }

  /* --- the funnel's hover card ----------------------------------
     Mouse-anchored, clamped to the viewport, with a short close delay
     so the cursor can travel from the pill into the card. */
  let pop, closeTimer;
  function ensurePop() {
    if (pop && pop.isConnected) return pop;
    pop = document.createElement('div');
    pop.className = 'ad-fn-pop';
    pop.hidden = true;
    pop.addEventListener('mouseenter', () => clearTimeout(closeTimer));
    pop.addEventListener('mouseleave', scheduleClose);
    document.body.appendChild(pop);
    return pop;
  }
  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => { if (pop) pop.hidden = true; }, 140);
  }

  function bindFunnel(root, m, onImprove) {
    root.querySelectorAll('.ad-fn-pill').forEach((el) => {
      const s = m[Number(el.dataset.step)];
      el.addEventListener('mouseenter', (e) => {
        clearTimeout(closeTimer);
        const p = ensurePop();
        const h = healthOf(s.dropOffRate);
        p.innerHTML = `
          <div class="hd"><b>${s.stepTitle}</b>${healthMark(h)}</div>
          <div class="rows">
            <div><span>Entries</span><b>${s.entries.toLocaleString()}</b></div>
            <div><span>Completions</span><b>${s.completions.toLocaleString()}</b></div>
            <div><span>Drop-off rate</span><b class="h-${h}">${s.dropOffRate.toFixed(1)}%</b></div>
            <div class="last"><span>Avg time</span><b>${formatTime(s.averageTimeMinutes)}</b></div>
          </div>
          <div class="ft"><button class="ad-btn dark" type="button">${window.adIcon('sparkle')}Improve with AI</button></div>`;
        p.hidden = false;
        const W = 296, H = 260, OFF = 14;
        let left = e.clientX + OFF;
        let top = e.clientY + OFF;
        if (left + W > window.innerWidth - 8) left = e.clientX - W - OFF;
        if (top + H > window.innerHeight - 8) top = e.clientY - H - OFF;
        p.style.left = `${Math.max(8, left)}px`;
        p.style.top = `${Math.max(8, top)}px`;
        p.querySelector('button').onclick = () => {
          p.hidden = true;
          (onImprove || ((step) => window.adToast(`“${step.stepTitle}” — the builder isn’t wired up in this prototype.`)))(s);
        };
      });
      el.addEventListener('mouseleave', scheduleClose);
    });
  }

  return {
    HEALTH_CRITICAL_THRESHOLD, HEALTH_WARNING_THRESHOLD, HEALTH_LABEL,
    healthOf, formatTime, stepMetrics, summary, attention, fixes,
    funnelHTML, tableHTML, bindFunnel, healthMark,
  };
})();
