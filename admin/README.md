# Imported admin mock-up

Source: https://github.com/mikenowosadko/eai-admin-navigation-test

Revision: `5260cc98718a95d86864d567665318062f21f8b5`

Imported workspace, CLI, profile and app administration screens with their own
assets. The source landing page is excluded. Its builder is retained because
it hosts the app dashboards and workspace drawer.

The current `build-web/index-chat-first.html` and `builder-chat-first.html`
remain the entry and pre-publish journey. Login stays in that builder.
Publish → Manage your app opens `admin/build-web/ws-home.html?demo=michael`.
CLI continuation opens the imported CLI screen. New app and the admin home
composer return to the current chat-first builder.

`assets/local-handoff.js` transfers the workspace, identity and app summary
into the source mock-up's existing created-app slot. Storage is namespaced
`eai-local-admin:`. This is demo state, not a backend deployment or full
workflow export; analytics and the remaining apps are sample data.

Client and submission detail pages were retained from the local admin version
to complete an analytics destination missing from the source repository.
