#!/usr/bin/env python3
"""
The local server for these prototypes. Static files, no dependencies, and
one thing python3 -m http.server does not do: it tells the browser not to
cache anything.

WHY THIS FILE EXISTS
--------------------
`python3 -m http.server` sends `Last-Modified` and no `Cache-Control` at
all. With no explicit directive a browser is free to invent one, and they
all do — the usual heuristic is to treat a file as fresh for about 10% of
its age, so a stylesheet last edited an hour ago gets cached for six
minutes and one edited yesterday for rather longer.

That is invisible until you are editing and reloading, which is the only
thing anyone does here. What it looks like from the outside is a change
that did not work: the markup updates, the JavaScript updates, and the
CSS quietly does not, so half your change appears and you go looking for
a bug in the half that did not. It has cost this repo real time.

It is worse for /states than for the flows, because that page fetches
`signup/index.html` at runtime and drives it by id. A cached copy of the
app plus current state code is not a stale page, it is a broken one — the
state code reaches for an element the old markup does not have.

So: no-store on everything, and the browser asks every time. These are
prototypes on a laptop; there is nothing here worth caching.

USAGE
-----
    python3 serve.py            # http://localhost:8000
    python3 serve.py 8899       # somewhere else

`npx serve .` is also fine — it sends `must-revalidate`, which has the
same effect. It is plain `http.server` that will lie to you.
"""

import sys
from http.server import SimpleHTTPRequestHandler, test


class NoStore(SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler, minus the guessing."""

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        # One line per request is noise when a page pulls thirty files.
        # Errors still come through, because those are worth seeing.
        if not args or not str(args[0]).startswith(('GET', 'HEAD')):
            super().log_message(fmt, *args)


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f'Prototypes on http://localhost:{port} — nothing is cached.')
    test(HandlerClass=NoStore, port=port, bind='127.0.0.1')
