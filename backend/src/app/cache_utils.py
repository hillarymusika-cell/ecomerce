"""
Cache-aside helpers for catalog + admin analytics.

Design:
  - Redis when REDIS_URL is set (shared across workers)
  - LocMem fallback for local dev
  - Fail-open: cache errors never break requests
  - Cart / checkout / stock are NOT cached (DB is source of truth)
"""
from __future__ import annotations

import hashlib
import logging
from typing import Any, Callable, Optional

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

TTL = getattr(
    settings,
    "CACHE_TTL",
    {
        "product": 300,
        "product_list": 120,
        "category": 1800,
        "dashboard": 60,
    },
)


def _ttl(name: str, default: int = 300) -> int:
    return int(TTL.get(name, default))


def product_detail_key(slug: str) -> str:
    return f"product:slug:{slug}"


def product_list_key(query: dict) -> str:
    """Stable key from sorted query params (public list only)."""
    parts = []
    for k in sorted(query.keys()):
        v = query[k]
        if v is None or v == "":
            continue
        if isinstance(v, (list, tuple)):
            v = ",".join(str(x) for x in v)
        parts.append(f"{k}={v}")
    raw = "&".join(parts) or "default"
    digest = hashlib.md5(raw.encode()).hexdigest()[:16]
    return f"product:list:{digest}"


def category_list_key(*, public: bool = True) -> str:
    return "category:list:public" if public else "category:list:staff"


def dashboard_key(days: int) -> str:
    return f"admin:dashboard:days={days}"


def cache_get(key: str) -> Any:
    try:
        return cache.get(key)
    except Exception:
        logger.exception("cache get failed key=%s", key)
        return None


def cache_set(key: str, value: Any, timeout: int) -> None:
    try:
        cache.set(key, value, timeout)
    except Exception:
        logger.exception("cache set failed key=%s", key)


def cache_delete(*keys: str) -> None:
    for key in keys:
        if not key:
            continue
        try:
            cache.delete(key)
        except Exception:
            logger.exception("cache delete failed key=%s", key)


def cache_delete_pattern(pattern: str) -> None:
    """Best-effort pattern delete (django-redis). No-op on LocMem."""
    try:
        delete_pattern = getattr(cache, "delete_pattern", None)
        if callable(delete_pattern):
            delete_pattern(pattern)
    except Exception:
        logger.exception("cache delete_pattern failed pattern=%s", pattern)


def get_or_set(
    key: str,
    loader: Callable[[], Any],
    timeout: int,
    *,
    lock: bool = True,
) -> Any:
    """
    Cache-aside with optional single-flight lock (django-redis).
    Prevents stampede on hot keys when Redis is available.
    """
    cached = cache_get(key)
    if cached is not None:
        return cached

    def _load_and_store() -> Any:
        again = cache_get(key)
        if again is not None:
            return again
        value = loader()
        if value is not None:
            cache_set(key, value, timeout)
        return value

    if not lock:
        return _load_and_store()

    lock_fn = getattr(cache, "lock", None)
    if not callable(lock_fn):
        return _load_and_store()

    try:
        with cache.lock(f"lock:{key}", timeout=5, blocking_timeout=3):
            return _load_and_store()
    except Exception:
        # Lock unavailable or contested – still serve from loader
        logger.debug("cache lock skipped key=%s", key, exc_info=True)
        return _load_and_store()


def invalidate_product(slug: Optional[str] = None) -> None:
    if slug:
        cache_delete(product_detail_key(slug))
    # List keys are hashed; wipe by pattern when Redis supports it
    cache_delete_pattern("*:product:list:*")
    # Also clear common unversioned prefix used with KEY_PREFIX
    cache_delete_pattern("product:list:*")


def invalidate_categories() -> None:
    cache_delete(category_list_key(public=True), category_list_key(public=False))


def invalidate_dashboard() -> None:
    cache_delete_pattern("*:admin:dashboard:*")
    cache_delete_pattern("admin:dashboard:*")
