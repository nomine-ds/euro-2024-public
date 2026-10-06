import hmac

from fastapi import HTTPException

from app.cache import get_admin_api_key


def require_admin_api_key(x_api_key: str | None) -> None:
    expected = get_admin_api_key()
    if expected is None:
        raise HTTPException(status_code=503, detail="Administrative API is not configured.")
    if x_api_key is None or not hmac.compare_digest(
        x_api_key.encode("utf-8"), expected.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="Invalid API key")
