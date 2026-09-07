/* Adapter between the local chat-first journey and the imported admin demo. */
(() => {
  const params = new URLSearchParams(location.search);
  const prefix = 'eai-local-admin:';
  const read = key => {
    try { return JSON.parse(localStorage.getItem(prefix + key)); } catch { return null; }
  };
  const write = (key, value) => {
    try { localStorage.setItem(prefix + key, JSON.stringify(value)); } catch { /* Private browsing may disable storage. */ }
  };
  if (params.get('handoff') === '1') {
    const name = params.get('project') || 'New App';
    const email = params.get('email') || '';
    write('active-company', 'northwind-ops');
    write('workspace-northwind-ops', {
      ...(read('workspace-northwind-ops') || {}), name: params.get('ws') || 'My workspace',
    });
    write('signed-in-user', {
      email, name: email.split('@')[0].replace(/[._+-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Workspace owner',
    });
    write('created-app', {
      id: 'vendor-onboarding', name, initial: name.charAt(0),
      prompt: params.get('prompt') || name,
      status: params.get('published') === '1' ? 'Live' : 'Draft',
      url: params.get('published') === '1' ? params.get('appUrl') : '',
    });
    // Do not replay the original handoff when navigating back or refreshing.
    params.delete('handoff');
    history.replaceState(null, '', location.pathname + '?' + params.toString());
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-local-new-app]')) return;
    event.preventDefault();
    const user = read('signed-in-user') || {};
    const company = window.adActiveCompany?.() || read('workspace-northwind-ops') || {};
    const url = new URL('../../build-web/builder-chat-first.html', location.href);
    if (user.email) url.searchParams.set('email', user.email);
    if (company.name) url.searchParams.set('ws', company.name);
    location.href = url.href;
  });
})();
