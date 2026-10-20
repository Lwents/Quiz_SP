"""Enforce request limits before JSON/multipart parsers allocate large objects."""

from starlette.responses import JSONResponse


class RequestSizeLimitMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in ("POST", "PUT", "PATCH"):
            return await self.app(scope, receive, send)
        path = scope["path"]
        root_path = scope.get("root_path", "")
        if root_path and path.startswith(root_path):
            path = path[len(root_path):]
        limit = 1024 * 1024
        if path.startswith("/api/v1/auth/"):
            limit = 16 * 1024
        elif path.startswith("/api/v1/ai/"):
            limit = 32 * 1024
        elif path.startswith("/api/v1/media/"):
            limit = 9 * 1024 * 1024
        elif path.startswith("/api/v1/backups/"):
            limit = 52 * 1024 * 1024

        async def reject():
            await JSONResponse({"detail": "Request body too large"}, status_code=413,
                               headers={"X-Content-Type-Options": "nosniff"})(scope, receive, send)

        headers = dict(scope.get("headers", []))
        if b"content-length" in headers:
            try:
                if int(headers[b"content-length"]) > limit:
                    return await reject()
            except ValueError:
                return await JSONResponse({"detail": "Invalid Content-Length"}, status_code=400)(scope, receive, send)
        chunks = []
        size = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            chunk = message.get("body", b"")
            size += len(chunk)
            if size > limit:
                return await reject()
            chunks.append(chunk)
            if not message.get("more_body", False):
                break
        delivered = False

        async def replay():
            nonlocal delivered
            if delivered:
                return await receive()
            delivered = True
            return {"type": "http.request", "body": b"".join(chunks), "more_body": False}

        return await self.app(scope, replay, send)
