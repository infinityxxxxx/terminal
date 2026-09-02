#!/usr/bin/env bash
# no-store dev server so ES-module edits show up on reload without a hard refresh
cd "$(dirname "$0")"
PORT="${1:-8171}"
exec python3 -c "
import http.server, socketserver, sys
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
socketserver.TCPServer.allow_reuse_address = True
print('serving on http://localhost:%s' % sys.argv[1])
socketserver.TCPServer(('', int(sys.argv[1])), H).serve_forever()
" "$PORT"
