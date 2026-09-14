import tiktoken
from typing import Dict, Optional, Any
import logging

logger = logging.getLogger(__name__)

# Model encoding mapping
MODEL_ENCODING_MAP: Dict[str, str] = {
    'gpt-4o': 'cl100k_base',
    'gpt-4o-mini': 'cl100k_base',
    'gpt-4-turbo': 'cl100k_base',
    'gpt-3.5-turbo': 'cl100k_base',
    'gemini-1.5-flash': 'cl100k_base',  # Approximate
    'gemini-1.5-pro': 'cl100k_base',    # Approximate
    'claude-3-haiku-20240307': 'cl100k_base',  # Approximate
    'claude-3-sonnet-20240229': 'cl100k_base',
    'claude-3-opus-20240229': 'cl100k_base',
    'default': 'cl100k_base'
}

# Pricing per 1M tokens (USD)
PRICING: Dict[str, Dict[str, float]] = {
    'google_gemini': {
        'input': 0.10,
        'output': 0.40,
        'model': 'gemini-1.5-flash'
    },
    'google_gemini_pro': {
        'input': 2.50,
        'output': 7.50,
        'model': 'gemini-1.5-pro'
    },
    'openai': {
        'input': 0.15,
        'output': 0.60,
        'model': 'gpt-4o-mini'
    },
    'openai_gpt4': {
        'input': 5.00,
        'output': 15.00,
        'model': 'gpt-4-turbo'
    },
    'anthropic_claude': {
        'input': 0.25,
        'output': 1.25,
        'model': 'claude-3-haiku-20240307'
    },
    'anthropic_claude_sonnet': {
        'input': 3.00,
        'output': 15.00,
        'model': 'claude-3-sonnet-20240229'
    }
}

# Cache for encoding
_encoding_cache = {}


def get_encoding(model: str = "default"):
    """Get token encoding with caching"""
    if model in _encoding_cache:
        return _encoding_cache[model]
    
    encoding_name = MODEL_ENCODING_MAP.get(model, MODEL_ENCODING_MAP['default'])
    try:
        # Try to get encoding by model name first
        encoding = tiktoken.encoding_for_model(model)
        _encoding_cache[model] = encoding
        return encoding
    except KeyError:
        try:
            # Fallback to encoding name
            encoding = tiktoken.get_encoding(encoding_name)
            _encoding_cache[model] = encoding
            return encoding
        except Exception as e:
            logger.warning(f"Error getting encoding for {model}: {e}")
            # Last resort: simple character-based estimation
            return None


def count_tokens(text: str, model: str = "default") -> int:
    """
    Count tokens with fallback to character-based estimation
    """
    if not text:
        return 0
    
    try:
        encoding = get_encoding(model)
        if encoding:
            return len(encoding.encode(text))
    except Exception as e:
        logger.debug(f"Token counting error for {model}: {e}")
    
    # Fallback: estimate based on character count
    # For Indonesian text, about 3-4 chars per token
    char_count = len(text)
    
    # Adjust based on content type
    # Count letters vs non-letters
    alpha_count = sum(1 for c in text if c.isalpha())
    digit_count = sum(1 for c in text if c.isdigit())
    space_count = sum(1 for c in text if c.isspace())
    
    # More accurate estimation
    # Indonesian has many syllables, so tokens/char ratio is higher
    if alpha_count / max(char_count, 1) > 0.7:  # Mostly alphabetic
        return max(1, char_count // 3)  # 3 chars per token for Indonesian
    elif digit_count / max(char_count, 1) > 0.3:  # Many numbers
        return max(1, char_count // 5)  # Numbers are more token-dense
    else:
        return max(1, char_count // 4)  # General fallback


def count_tokens_batch(texts: list, model: str = "default") -> list:
    """Count tokens for multiple texts efficiently"""
    if not texts:
        return []
    
    encoding = get_encoding(model)
    if encoding:
        try:
            return [len(encoding.encode(t)) for t in texts]
        except:
            pass
    
    # Fallback for each
    return [count_tokens(t, model) for t in texts]


def estimate_cost(
    total_tokens: int,
    provider: str = 'google_gemini',
    input_tokens: Optional[int] = None,
    output_tokens: Optional[int] = None
) -> Dict[str, Any]:
    """
    Estimate cost based on token usage
    
    Args:
        total_tokens: Total tokens (if input/output not specified)
        provider: Provider name
        input_tokens: Input tokens (if known)
        output_tokens: Output tokens (if known)
    """
    # Get pricing
    pricing = PRICING.get(provider, PRICING['google_gemini'])
    
    # If input/output not specified, assume 60% input, 40% output
    if input_tokens is None or output_tokens is None:
        input_tokens = int(total_tokens * 0.6)
        output_tokens = total_tokens - input_tokens
    
    # Calculate cost
    cost_input = (input_tokens / 1_000_000) * pricing.get('input', 0)
    cost_output = (output_tokens / 1_000_000) * pricing.get('output', 0)
    total_cost = cost_input + cost_output
    
    # Currency conversion (approximate)
    usd_to_idr = 15500
    
    return {
        'total_tokens': total_tokens,
        'input_tokens': input_tokens,
        'output_tokens': output_tokens,
        'cost_usd': round(total_cost, 6),
        'cost_idr': round(total_cost * usd_to_idr, 0),
        'provider': provider,
        'model': pricing.get('model', 'unknown'),
        'input_cost': round(cost_input, 6),
        'output_cost': round(cost_output, 6)
    }


def estimate_tokens_from_text(text: str, language: str = 'indonesian') -> int:
    """
    Estimate tokens from text based on language-specific rules
    
    Args:
        text: Input text
        language: 'indonesian', 'english', or 'mixed'
    """
    if not text:
        return 0
    
    char_count = len(text)
    
    if language == 'indonesian':
        # Indonesian has ~3-4 chars per token
        return max(1, char_count // 3)
    elif language == 'english':
        # English has ~4 chars per token
        return max(1, char_count // 4)
    else:  # mixed
        # Conservative estimate
        return max(1, char_count // 3)


# Utility untuk logging token usage
def log_token_usage(
    query: str,
    response: str,
    provider: str,
    model: str = "default"
) -> Dict[str, Any]:
    """Log token usage with cost estimation"""
    input_tokens = count_tokens(query, model)
    output_tokens = count_tokens(response, model)
    total_tokens = input_tokens + output_tokens
    
    cost = estimate_cost(
        total_tokens,
        provider=provider,
        input_tokens=input_tokens,
        output_tokens=output_tokens
    )
    
    # Log detailed usage
    logger.info(f"Token usage - Provider: {provider}, "
                f"Input: {input_tokens}, Output: {output_tokens}, "
                f"Total: {total_tokens}, Cost: ${cost['cost_usd']:.6f}")
    
    return {
        'input_tokens': input_tokens,
        'output_tokens': output_tokens,
        'total_tokens': total_tokens,
        'cost': cost
    }