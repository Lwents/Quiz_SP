"""Bounded, process-local limits for the single-worker local deployment."""

from collections import OrderedDict, deque
from threading import Lock
from time import monotonic

from fastapi import HTTPException, Request


class SlidingWindowLimiter:
    def __init__(self, max_keys=10000):
        self.entries = OrderedDict()
        self.max_keys = max_keys
        self.lock = Lock()

    def check(self, key, limit, seconds):
        now = monotonic()
        with self.lock:
            hits = self.entries.pop(key, deque())
            while hits and hits[0] <= now - seconds:
                hits.popleft()
            self.entries[key] = hits
            while len(self.entries) > self.max_keys:
                self.entries.popitem(last=False)
            if len(hits) >= limit:
                raise HTTPException(status_code=429, detail="Quá nhiều yêu cầu. Hãy thử lại sau.",
                                    headers={"Retry-After": str(max(1, int(seconds - (now - hits[0])) + 1))})
            hits.append(now)


limiter = SlidingWindowLimiter()


def limit_auth_requests(request: Request):
    # Forwarded headers are deliberately ignored: clients must not select their
    # own rate-limit identity. Nginx applies an additional per-client limit.
    host = request.client.host if request.client else "unknown"
    limiter.check(("auth", host, request.url.path), 30, 60)
