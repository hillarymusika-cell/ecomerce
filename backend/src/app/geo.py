"""Resolve approximate geo from client IP (no extra form fields)."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.request
from decimal import Decimal, InvalidOperation
from ipaddress import ip_address

logger = logging.getLogger(__name__)

# Free, no-key IP geolocation (rate-limited; fail soft).
_GEO_URL = "http://ip-api.com/json/{ip}?fields=status,message,country,city,lat,lon,query"
_TIMEOUT = 2.5


def client_ip(request) -> str | None:
    """Best-effort client IP (supports common proxy headers)."""
    forwarded = (request.META.get("HTTP_X_FORWARDED_FOR") or "").split(",")[0].strip()
    real = (request.META.get("HTTP_X_REAL_IP") or "").strip()
    remote = (request.META.get("REMOTE_ADDR") or "").strip()
    for candidate in (forwarded, real, remote):
        if not candidate:
            continue
        try:
            ip_address(candidate)
            return candidate
        except ValueError:
            continue
    return None


def _is_public(ip: str) -> bool:
    try:
        return ip_address(ip).is_global
    except ValueError:
        return False


def lookup_geo(ip: str | None) -> dict:
    """
    Return {country, city, latitude, longitude, default_ip}.
    Empty strings / None on failure — never raises.
    """
    result = {
        "country": "",
        "city": "",
        "latitude": None,
        "longitude": None,
        "default_ip": ip or None,
    }
    if not ip or not _is_public(ip):
        return result

    url = _GEO_URL.format(ip=ip)
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": "AdamsCollection/1.0"},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=_TIMEOUT) as resp:
            payload = json.loads(resp.read().decode("utf-8", errors="replace"))
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as exc:
        logger.debug("geo lookup failed for %s: %s", ip, exc)
        return result

    if payload.get("status") != "success":
        return result

    result["country"] = (payload.get("country") or "")[:50]
    result["city"] = (payload.get("city") or "")[:50]
    try:
        if payload.get("lat") is not None:
            result["latitude"] = Decimal(str(payload["lat"]))
        if payload.get("lon") is not None:
            result["longitude"] = Decimal(str(payload["lon"]))
    except (InvalidOperation, TypeError, ValueError):
        pass
    return result


def apply_geo_to_user(user, request, *, overwrite: bool = False) -> None:
    """
    Attach geo fields from request IP onto user.
    overwrite=False only fills blank fields (typical on login).
    """
    geo = lookup_geo(client_ip(request))
    update_fields = []

    if geo.get("default_ip") and (overwrite or not user.default_ip):
        user.default_ip = geo["default_ip"]
        update_fields.append("default_ip")

    if geo.get("country") and (overwrite or not (user.country or "").strip()):
        user.country = geo["country"]
        update_fields.append("country")

    if geo.get("city") and (overwrite or not (user.city or "").strip()):
        user.city = geo["city"]
        update_fields.append("city")

    if geo.get("latitude") is not None and (overwrite or user.latitude is None):
        user.latitude = geo["latitude"]
        update_fields.append("latitude")

    if geo.get("longitude") is not None and (overwrite or user.longitude is None):
        user.longitude = geo["longitude"]
        update_fields.append("longitude")

    if update_fields:
        update_fields.append("updated_at")
        user.save(update_fields=update_fields)
