/* Shared prototype handoff: choose a tool without launching or installing it. */
window.openEaiCliHandoff = function(project, onMove) {
  if (onMove) {
    // Keep a stable workspace reference throughout the handoff.
    const hostDocument = window.top.document;
    const workspaceShell = hostDocument.querySelector('.ad-ws');
    if (workspaceShell?.classList.contains('ad-sidebar-closed')) {
      workspaceShell.querySelector('[data-sidebar-toggle]')?.click();
    }
    if (!workspaceShell && !document.body.classList.contains('bd-workspace-drawer-open')) {
      document.querySelector('[data-workspace-drawer-open]')?.click();
    }

    document.getElementById('eaiCliConfirm')?.remove();
    const confirm = document.createElement('dialog');
    confirm.id = 'eaiCliConfirm';
    confirm.className = 'eai-cli-dialog';
    confirm.setAttribute('aria-labelledby', 'eaiCliConfirmTitle');
    confirm.innerHTML = `<h2 id="eaiCliConfirmTitle">Move this app to build with EAI CLI?</h2>
      <p></p><footer><button type="button" data-stay>Keep in No Code Builder</button><button type="button" data-move>Move to EAI CLI →</button></footer>`;
    confirm.querySelector('p').textContent = `${project} will switch to the CLI app view. Next, choose the coding tool you want to use.`;
    confirm.querySelector('[data-stay]').onclick = () => confirm.close();
    confirm.querySelector('[data-move]').onclick = () => { confirm.close(); onMove(); };
    confirm.addEventListener('click', event => { if (event.target === confirm) confirm.close(); });
    document.body.appendChild(confirm);
    confirm.showModal();
    return;
  }
  let dialog = document.getElementById('eaiCliHandoff');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'eaiCliHandoff';
    dialog.className = 'eai-cli-dialog';
    dialog.setAttribute('aria-labelledby', 'eaiCliTitle');
    dialog.innerHTML = `<form method="dialog"><button class="eai-cli-dismiss" aria-label="Close" value="cancel">×</button></form>
      <h2 id="eaiCliTitle"></h2><p>Add custom logic, integrations and more advanced features using your preferred coding tool.</p>
      <fieldset><legend>Where would you like to continue?</legend>
      ${['Codex','Claude Code','Cursor','Another tool'].map(tool => `<label><input type="radio" name="cli-tool" value="${tool}"><span>${tool}</span></label>`).join('')}</fieldset>
      <p class="eai-cli-result" role="status"></p>
      <footer><button type="button" data-cli-cancel>Cancel</button><button type="button" data-cli-continue disabled>Choose a tool to continue</button></footer>`;
    document.body.appendChild(dialog);
    const action = dialog.querySelector('[data-cli-continue]');
    dialog.addEventListener('change', () => {
      const choice = dialog.querySelector('input:checked').value;
      action.disabled = false;
      action.textContent = choice === 'Another tool' ? 'Continue with another tool →' : `Continue with ${choice} →`;
      dialog.querySelector('.eai-cli-result').textContent = '';
    });
    dialog.querySelector('[data-cli-cancel]').addEventListener('click', () => dialog.close());
    action.addEventListener('click', () => {
      const choice = dialog.querySelector('input:checked')?.value;
      if (!choice) return;
      try { localStorage.setItem('eai-cli-tool', choice); } catch {}
      dialog.querySelector('.eai-cli-result').textContent = `${choice} selected. This prototype stops here; no coding tool has been opened.`;
    });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  }
  dialog.querySelector('h2').textContent = `Continue building ${project} with EAI CLI`;
  dialog.querySelector('.eai-cli-result').textContent = '';
  let remembered;
  try { remembered = localStorage.getItem('eai-cli-tool'); } catch {}
  if (remembered) {
    const radio = [...dialog.querySelectorAll('input')].find(input => input.value === remembered);
    if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change', {bubbles:true})); }
  }
  if (!dialog.open) dialog.showModal();
};

window.moveEaiAppToCli = function(project, details) {
  const url = new URL(location.pathname.includes('/admin/') ? 'builder.html' : '../admin/build-web/builder.html', location.href);
  new URLSearchParams(location.search).forEach((value, key) => url.searchParams.set(key, value));
  Object.entries({...details, project, surface:'cli', view:'dashboard', section:'overview', drawer:'open', chooseCliTool:'1', experience:'full'}).forEach(([key,value]) => url.searchParams.set(key,value));
  url.searchParams.delete('cliSetup');
  try { localStorage.setItem('eai-cli-app:' + (details.ws || '') + ':' + project, '1'); } catch {}
  location.href = url.href;
};
window.addEventListener('load', () => {
  const query = new URLSearchParams(location.search);
  if (query.get('chooseCliTool') === '1') {
    window.openEaiCliHandoff(query.get('project') || 'this app');
    query.delete('chooseCliTool');
    history.replaceState(history.state, '', location.pathname + '?' + query.toString());
  }
});
