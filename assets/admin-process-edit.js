/* ------------------------------------------------------------------
   Process editor — chat + workflow preview for an existing process.

   Layout mirrors eainocodebuilder ConfiguratorShell (chat pinned left,
   preview flexes right). Preview markup comes from admin-process-live.js
   so View and Edit show the same form.
------------------------------------------------------------------- */

(function () {
  const CHECK =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const REFRESH =
    '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M3 3v5h5M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M16 16h5v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  /** Seeded edit-session transcripts — candidate screening matches Paper. */
  const EDIT_CHAT = {
    'candidate-screening': {
      placeholder: 'Ask the assistant to change the table…',
      messages: [
        {
          role: 'ai',
          text: 'Your workflow is published and live. I can still change how candidates are ranked — just tell me what to adjust.',
        },
        { role: 'user', text: 'Add a column for years of experience and re-rank everyone.' },
        { role: 'status', tone: 'ok', text: 'Column added · table updated' },
        { role: 'status', tone: 'info', text: 'Re-ranked 24 candidates' },
      ],
    },
    'kyc-onboarding': {
      placeholder: 'Ask the assistant to change the form…',
      messages: [
        {
          role: 'ai',
          text: 'Your KYC workflow is published and live. I can adjust fields, document requirements, or verification rules — tell me what to change.',
        },
        { role: 'user', text: 'Make proof of address optional for existing customers.' },
        { role: 'status', tone: 'ok', text: 'Field updated · preview refreshed' },
      ],
    },
    'vendor-onboarding': {
      placeholder: 'Describe a change to the questionnaire…',
      messages: [
        {
          role: 'ai',
          text: 'This draft is ready to edit. Describe what the vendor questionnaire should capture and I\'ll update the form.',
        },
      ],
    },
    'invoice-processing': {
      placeholder: 'Describe a change to the intake form…',
      messages: [
        {
          role: 'ai',
          text: 'This draft is ready to edit. Tell me what should change on the invoice submission step.',
        },
      ],
    },
    'leave-approval': {
      placeholder: 'Ask the assistant to change the leave form…',
      messages: [
        {
          role: 'ai',
          text: 'Your leave approval workflow is live. I can adjust leave types, date rules, or who gets notified — tell me what to change.',
        },
        { role: 'user', text: 'Add a half-day option for sick leave.' },
        { role: 'status', tone: 'ok', text: 'Field added · preview refreshed' },
      ],
    },
  };

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function chatFor(id) {
    return EDIT_CHAT[id] || {
      placeholder: 'Describe a change…',
      messages: [{ role: 'ai', text: 'Tell me what to change in this workflow.' }],
    };
  }

  function renderChat(id) {
    const chat = chatFor(id);
    return chat.messages
      .map((m) => {
        if (m.role === 'user') {
          return `<div class="bd-msg user"><div class="bd-bub">${esc(m.text)}</div></div>`;
        }
        if (m.role === 'status') {
          const icon = m.tone === 'info' ? REFRESH : CHECK;
          return `<div class="ad-edit-status ad-edit-status--${m.tone || 'ok'}">${icon}<span>${esc(m.text)}</span></div>`;
        }
        return `<div class="bd-msg"><div class="bd-av">AI</div><div class="bd-bub">${esc(m.text)}</div></div>`;
      })
      .join('');
  }

  window.AD_PROCESS_EDIT = {
    chatFor,
    renderChat,
    url(id) {
      return `process-edit.html?app=${encodeURIComponent(id)}`;
    },
  };
})();
