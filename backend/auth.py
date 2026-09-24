"""Password hashing and signed bearer-token helpers for the local app."""

import base64
import binascii
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any, Dict

AUTH_SECRET = os.environ.get("AUTH_SECRET", "local-dev-change-this-secret")
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
    return f"scrypt${base64.urlsafe_b64encode(salt).decode()}${base64.urlsafe_b64encode(digest).decode()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, salt_text, digest_text = stored.split("$", 2)
        if algorithm != "scrypt":
            return False
        salt = base64.urlsafe_b64decode(salt_text.encode())
        expected = base64.urlsafe_b64decode(digest_text.encode())
        actual = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def create_token(kid_id: int, auth_version: int = 0) -> str:
    payload = {"kid_id": kid_id, "auth_version": auth_version, "exp": int(time.time()) + TOKEN_TTL_SECONDS}
    encoded = _encode(payload)
    signature = _sign(encoded)
    return f"{encoded}.{signature}"


def decode_token(token: str) -> Dict[str, Any]:
    try:
        encoded, signature = token.split(".", 1)
        if not hmac.compare_digest(signature, _sign(encoded)):
            raise ValueError("Invalid token signature")
        padded = encoded + "=" * (-len(encoded) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded.encode()))
        if int(payload["exp"]) < int(time.time()):
            raise ValueError("Token expired")
        return payload
    except (ValueError, KeyError, TypeError, json.JSONDecodeError, binascii.Error):
        raise ValueError("Invalid authentication token")


def _encode(payload: Dict[str, Any]) -> str:
    return base64.urlsafe_b64encode(json.dumps(payload, separators=(",", ":")).encode()).decode().rstrip("=")


def _sign(value: str) -> str:
    return hmac.new(AUTH_SECRET.encode(), value.encode(), hashlib.sha256).hexdigest()
