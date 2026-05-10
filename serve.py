"""
Dream Network — Servidor de produção simples.
Serve ficheiros estáticos do frontend e faz proxy de /api/ para o backend.
"""

import http.server
import json
import os
import urllib.request
import urllib.error

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")
BACKEND_URL = "http://localhost:8000"
PORT = 3000


class DreamHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/"):
            return self._proxy()
        return self._serve_static()

    def do_POST(self):
        if self.path.startswith("/api/"):
            return self._proxy()
        self.send_error(405)

    def _proxy(self):
        import http.client

        body = None
        if self.command == "POST":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length)

        # Forward headers
        headers = {}
        for key in self.headers:
            if key.lower() not in ("host", "connection", "transfer-encoding"):
                headers[key] = self.headers[key]

        try:
            target = BACKEND_URL + self.path
            req = urllib.request.Request(
                target,
                data=body,
                headers=headers,
                method=self.command,
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                self.send_response(resp.status)
                # Forward response headers
                for key, value in resp.headers.items():
                    if key.lower() not in ("transfer-encoding", "connection", "content-length", "content-encoding"):
                        # Forward Set-Cookie
                        if key.lower() == "set-cookie":
                            self.send_header(key, value)
                # Read and forward body
                data = resp.read()
                self.send_header("Content-Length", len(data))
                self.send_header("Content-Type", resp.headers.get("Content-Type", "application/json"))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def _serve_static(self):
        # SPA: all non-file routes serve index.html
        path = self.path.split("?")[0]
        file_path = os.path.join(FRONTEND_DIR, path.lstrip("/"))
        if not os.path.isfile(file_path):
            self.path = "/index.html"
        return super().do_GET()


if __name__ == "__main__":
    os.makedirs(FRONTEND_DIR, exist_ok=True)
    server = http.server.HTTPServer(("0.0.0.0", PORT), DreamHandler)
    print(f"Serving Dream Network at http://localhost:{PORT}")
    print(f"Proxying /api/ to {BACKEND_URL}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
