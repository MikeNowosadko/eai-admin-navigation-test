/* ------------------------------------------------------------------
   Publish success — congratulations + Manage app / Extend with CLI
   Ported from eainocodebuilder publish-dialog SuccessView
------------------------------------------------------------------- */
(function () {
  window.showPublishSuccess = function showPublishSuccess({
    projectName,
    publicUrl,
    onManage,
    onCli,
    onKeepEditing,
  }) {
    const overlay = document.createElement('div');
    overlay.className = 'bd-pub-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'bdPubTitle');
    overlay.innerHTML = `
      <div class="bd-pub-dialog">
        <div class="bd-pub-check" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none"><path d="M20 6 9 17 4 12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <h2 id="bdPubTitle">Your app is live</h2>
        <p class="bd-pub-name">${projectName}</p>
        <p class="bd-pub-lede">Congratulations — anyone with the link can open your form.</p>
        <div class="bd-pub-url">
          <input type="text" readonly value="${publicUrl}" />
          <button type="button" class="nb-btn" data-copy aria-label="Copy URL">Copy</button>
        </div>
        <div class="bd-pub-fork">
          <button type="button" class="nb-btn primary" data-manage>Manage your app</button>
          <button type="button" class="nb-btn" data-cli>Extend with the CLI</button>
        </div>
        <button type="button" class="bd-pub-keep" data-keep>Keep editing in the builder</button>
      </div>`;

    document.body.appendChild(overlay);
    document.body.classList.add('bd-pub-open');

    function close() {
      overlay.remove();
      document.body.classList.remove('bd-pub-open');
    }

    overlay.querySelector('[data-copy]').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(publicUrl);
        overlay.querySelector('[data-copy]').textContent = 'Copied';
        setTimeout(() => { overlay.querySelector('[data-copy]').textContent = 'Copy'; }, 2000);
      } catch (_) { /* noop */ }
    });

    overlay.querySelector('[data-manage]').addEventListener('click', () => {
      close();
      onManage?.();
    });

    overlay.querySelector('[data-cli]').addEventListener('click', () => {
      close();
      onCli?.();
    });

    overlay.querySelector('[data-keep]').addEventListener('click', () => {
      close();
      onKeepEditing?.();
    });
  };
})();
