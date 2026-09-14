import json
import functools
from app.core.config import REDIS_URL

redis_client = None
REDIS_AVAILABLE = False

try:
    import redis
    redis_client = redis.from_url(REDIS_URL, decode_responses=True)
    redis_client.ping()
    REDIS_AVAILABLE = True
    print("✅ Redis connected - Caching ENABLED")
except ImportError:
    print("⚠️ Redis library not installed. Run: pip install redis")
    print("   Caching DISABLED (API will run without cache)")
except Exception as e:
    print(f"⚠️ Redis connection failed: {e}")
    print("   Make sure Redis is running: redis-server")
    print("   Caching DISABLED (API will run without cache)")
    print("   For Windows without Redis, you can ignore this warning.")


def cache_sync(ttl: int = 3600):
    """
    Decorator untuk caching fungsi synchronous.
    Jika Redis tidak aktif, fungsi tetap jalan tanpa cache.
    """
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            if not REDIS_AVAILABLE or redis_client is None:
                return func(*args, **kwargs)
            
            key_parts = [func.__name__]
            key_parts.extend(str(arg) for arg in args)
            key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
            cache_key = "cache:" + ":".join(key_parts)
            
            try:
                cached = redis_client.get(cache_key)
                if cached is not None:
                    return json.loads(cached)
            except Exception:
                pass

            result = func(*args, **kwargs)

            try:
                redis_client.setex(cache_key, ttl, json.dumps(result, default=str))
            except Exception:
                pass
            
            return result
        return wrapper
    return decorator