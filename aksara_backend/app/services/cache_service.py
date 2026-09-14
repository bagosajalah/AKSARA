import hashlib
import json
import time
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Redis connection
try:
    import redis
    REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
    REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
    redis_client = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, decode_responses=True)
    redis_client.ping()
    REDIS_AVAILABLE = True
    logger.info(f"Redis connected: {REDIS_HOST}:{REDIS_PORT}")
except Exception as e:
    REDIS_AVAILABLE = False
    redis_client = None
    logger.warning(f"Redis not available: {e}")

# Memory cache fallback
_memory_cache = {}
DEFAULT_TTL = 3600
MAX_MEMORY_CACHE = 1000


def get_cache_key(tenant_id: str, query: str) -> str:
    query_hash = hashlib.md5(query.lower().strip().encode()).hexdigest()
    return f"llm:cache:{tenant_id}:{query_hash}"


def get_cached_response(tenant_id: str, query: str) -> Optional[str]:
    key = get_cache_key(tenant_id, query)
    
    if REDIS_AVAILABLE and redis_client:
        try:
            cached = redis_client.get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            logger.warning(f"Redis get error: {e}")
    
    # Memory cache fallback
    if key in _memory_cache:
        entry = _memory_cache[key]
        if entry.get('expires', 0) > time.time():
            return entry.get('data')
        else:
            del _memory_cache[key]
    
    return None


def set_cached_response(tenant_id: str, query: str, response: str, ttl: int = DEFAULT_TTL):
    key = get_cache_key(tenant_id, query)
    data = json.dumps(response)
    
    if REDIS_AVAILABLE and redis_client:
        try:
            redis_client.setex(key, ttl, data)
            return
        except Exception as e:
            logger.warning(f"Redis set error: {e}")
    
    # Memory cache fallback
    _memory_cache[key] = {
        'data': response,
        'expires': time.time() + ttl
    }


def invalidate_cache(tenant_id: str, query: Optional[str] = None):
    """Invalidate cache"""
    if query:
        key = get_cache_key(tenant_id, query)
        if REDIS_AVAILABLE and redis_client:
            try:
                redis_client.delete(key)
            except:
                pass
        if key in _memory_cache:
            del _memory_cache[key]
    else:
        # Invalidate semua cache tenant
        pattern = f"llm:cache:{tenant_id}:*"
        if REDIS_AVAILABLE and redis_client:
            try:
                keys = redis_client.keys(pattern)
                if keys:
                    redis_client.delete(*keys)
            except:
                pass
        keys_to_delete = [k for k in _memory_cache if k.startswith(f"llm:cache:{tenant_id}:")]
        for k in keys_to_delete:
            del _memory_cache[k]
            
def get_cache_stats() -> dict:
    """
    Mendapatkan statistik cache untuk monitoring
    """
    stats = {
        'redis_available': REDIS_AVAILABLE,
        'memory_cache_size': len(_memory_cache),
        'memory_cache_max': MAX_MEMORY_CACHE,
        'default_ttl': DEFAULT_TTL
    }
    
    if REDIS_AVAILABLE and redis_client:
        try:
            info = redis_client.info('stats')
            stats['redis_total_keys'] = redis_client.dbsize()
            stats['redis_hits'] = info.get('keyspace_hits', 0)
            stats['redis_misses'] = info.get('keyspace_misses', 0)
            
            hit_rate = stats['redis_hits'] / (stats['redis_hits'] + stats['redis_misses']) * 100 if (stats['redis_hits'] + stats['redis_misses']) > 0 else 0
            stats['redis_hit_rate'] = round(hit_rate, 2)
        except Exception as e:
            stats['redis_error'] = str(e)
    
    return stats


def clear_all_cache():
    """
    Menghapus semua cache (emergency)
    """
    if REDIS_AVAILABLE and redis_client:
        try:
            redis_client.flushdb()
        except Exception as e:
            logger.error(f"Error clearing Redis cache: {e}")
    
    _memory_cache.clear()
    logger.warning("⚠️ All cache cleared!")


def get_cache_ttl(tenant_id: str) -> int:
    """
    Mendapatkan TTL spesifik per tenant
    """
    return DEFAULT_TTL