/* Show workspace settings above the current app without replacing its page. */
document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.button !== 0 || event.metaKey || event.ctrlKey) return;
  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || !url.pathname.endsWith('/ws-home.html') || !url.searchParams.has('settings')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const host = window.top;
  const doc = host.document;
  if (doc.getElementById('workspaceSettingsOverlay')) return;
  const dialog = doc.createElement('dialog');
  dialog.id = 'workspaceSettingsOverlay';
  dialog.setAttribute('aria-label', 'Workspace settings');
  dialog.style.cssText = 'position:fixed;inset:0;width:100vw;height:100dvh;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;';
  const frame = doc.createElement('iframe');
  frame.title = 'Workspace settings';
  frame.style.cssText = 'display:block;width:100%;height:100%;border:0;background:transparent;';
  url.searchParams.delete('embedded');
  url.searchParams.set('settingsOverlay', '1');
  url.searchParams.set('demo', 'michael');
  frame.src = url.href;
  dialog.appendChild(frame);
  doc.body.appendChild(dialog);
  const close = () => { dialog.close(); dialog.remove(); host.removeEventListener('message', receive); link.focus(); };
  const receive = event => {
    if (event.origin === location.origin && event.source === frame.contentWindow && event.data === 'close-workspace-settings') close();
  };
  host.addEventListener('message', receive);
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  dialog.showModal();
}, true);
