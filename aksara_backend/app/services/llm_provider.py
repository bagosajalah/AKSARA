import os
import logging
import asyncio
from typing import Optional, AsyncGenerator, Tuple, List, Dict, Any
from app.utils.crypto import decrypt_api_key
from app.core.config import settings

logger = logging.getLogger(__name__)

PROVIDER_MODEL_MAP = {
    'google_gemini': {
        'default': settings.DEFAULT_LLM_MODEL or 'gemini-3.6-flash',
        'available': ['gemini-3.6-flash', 'gemini-1.5-pro', 'gemini-1.5-flash']
    },
    'openai': {
        'default': 'gpt-4o-mini',
        'available': ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
    },
    'anthropic': {
        'default': 'claude-3-haiku-20240307',
        'available': ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku']
    }
}

class BaseLLMProvider:
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
        self._available = bool(api_key and api_key.strip())
        self._client = None
        self._init_client()
    
    def _init_client(self):
        pass
    
    async def generate(self, prompt: str, system_prompt: str = "", **kwargs) -> str:
        raise NotImplementedError
    
    async def generate_stream(self, prompt: str, system_prompt: str = "", **kwargs) -> AsyncGenerator[str, None]:
        raise NotImplementedError


class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str):
        super().__init__(api_key, model)
    
    def _init_client(self):
        if self._available:
            try:
                from google import genai
                self._client = genai.Client(api_key=self.api_key.strip())
                self._available = True
                logger.info(f"Gemini initialized: {self.model}")
            except Exception as e:
                logger.error(f"Gemini init error: {e}")
                self._available = False
    
    async def generate(self, prompt: str, system_prompt: str = "", **kwargs) -> str:
        if not self._available:
            raise Exception("Gemini API Key tidak valid")
        
        full_prompt = f"{system_prompt}\n\n{prompt}".strip() if system_prompt else prompt
        
        try:
            model_name = self.model
            if not model_name:
                raise Exception("Model tidak diset untuk GeminiProvider")
            
            temperature = kwargs.get("temperature", 0.5)
            max_tokens = min(kwargs.get("max_tokens", 2000), 8192)
            
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self._client.models.generate_content(
                    model=model_name,
                    contents=full_prompt,
                    config={
                        "temperature": temperature,
                        "max_output_tokens": max_tokens,
                        "top_p": 0.95,
                    }
                )
            )
            
            if response and hasattr(response, 'text') and response.text:
                return response.text.strip()
            return str(response)
            
        except Exception as e:
            logger.error(f"Gemini generate error: {e}")
            raise
    
    async def generate_stream(self, prompt: str, system_prompt: str = "", **kwargs) -> AsyncGenerator[str, None]:
        if not self._available:
            raise Exception("Gemini API Key tidak valid")
        
        full_prompt = f"{system_prompt}\n\n{prompt}".strip() if system_prompt else prompt
        
        try:
            model_name = self.model
            if not model_name:
                raise Exception("Model tidak diset untuk GeminiProvider")
            
            temperature = kwargs.get("temperature", 0.5)
            max_tokens = min(kwargs.get("max_tokens", 2000), 8192)
            
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self._client.models.generate_content_stream(
                    model=model_name,
                    contents=full_prompt,
                    config={
                        "temperature": temperature,
                        "max_output_tokens": max_tokens,
                        "top_p": 0.95,
                    }
                )
            )
            
            for chunk in response:
                if hasattr(chunk, 'text') and chunk.text:
                    yield chunk.text
            return
                
        except Exception as e:
            logger.error(f"Gemini stream error: {e}")
            raise


class OpenAIProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str):
        super().__init__(api_key, model)
    
    def _init_client(self):
        if self._available:
            try:
                from openai import AsyncOpenAI
                self.client = AsyncOpenAI(api_key=self.api_key.strip(), timeout=30.0)
                self._available = True
                logger.info(f"OpenAI initialized: {self.model}")
            except Exception as e:
                logger.error(f"OpenAI init error: {e}")
                self._available = False
    
    async def generate(self, prompt: str, system_prompt: str = "", **kwargs) -> str:
        if not self._available:
            raise Exception("OpenAI API Key tidak valid")
        
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            model_to_use = self.model
            if not model_to_use:
                raise Exception("Model tidak diset untuk OpenAIProvider")
            
            response = await self.client.chat.completions.create(
                model=model_to_use,
                messages=messages,
                temperature=kwargs.get("temperature", 0.5),
                max_tokens=min(kwargs.get("max_tokens", 800), 4096),
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI generate error: {e}")
            raise
    
    async def generate_stream(self, prompt: str, system_prompt: str = "", **kwargs) -> AsyncGenerator[str, None]:
        if not self._available:
            raise Exception("OpenAI API Key tidak valid")
        
        try:
            messages = []
            if system_prompt:
                messages.append({"role": "system", "content": system_prompt})
            messages.append({"role": "user", "content": prompt})
            
            model_to_use = self.model
            if not model_to_use:
                raise Exception("Model tidak diset untuk OpenAIProvider")
            
            response = await self.client.chat.completions.create(
                model=model_to_use,
                messages=messages,
                temperature=kwargs.get("temperature", 0.5),
                max_tokens=min(kwargs.get("max_tokens", 800), 4096),
                stream=True
            )
            
            async for chunk in response:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
                    
        except Exception as e:
            logger.error(f"OpenAI stream error: {e}")
            raise


class AnthropicProvider(BaseLLMProvider):
    def __init__(self, api_key: str, model: str):
        super().__init__(api_key, model)
    
    def _init_client(self):
        if self._available:
            try:
                from anthropic import AsyncAnthropic
                self.client = AsyncAnthropic(api_key=self.api_key.strip(), timeout=30.0)
                self._available = True
                logger.info(f"Anthropic initialized: {self.model}")
            except Exception as e:
                logger.error(f"Anthropic init error: {e}")
                self._available = False
    
    async def generate(self, prompt: str, system_prompt: str = "", **kwargs) -> str:
        if not self._available:
            raise Exception("Anthropic API Key tidak valid")
        
        try:
            model_to_use = self.model
            if not model_to_use:
                raise Exception("Model tidak diset untuk AnthropicProvider")
            
            response = await self.client.messages.create(
                model=model_to_use,
                system=system_prompt or "Kamu adalah asisten AI yang ramah.",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=min(kwargs.get("max_tokens", 800), 4096),
                temperature=kwargs.get("temperature", 0.5)
            )
            return response.content[0].text.strip()
        except Exception as e:
            logger.error(f"Anthropic generate error: {e}")
            raise
    
    async def generate_stream(self, prompt: str, system_prompt: str = "", **kwargs) -> AsyncGenerator[str, None]:
        if not self._available:
            raise Exception("Anthropic API Key tidak valid")
        
        try:
            model_to_use = self.model
            if not model_to_use:
                raise Exception("Model tidak diset untuk AnthropicProvider")
            
            async with self.client.messages.stream(
                model=model_to_use,
                system=system_prompt or "Kamu adalah asisten AI yang ramah.",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=min(kwargs.get("max_tokens", 800), 4096),
                temperature=kwargs.get("temperature", 0.5)
            ) as stream:
                async for chunk in stream:
                    if chunk.type == "content_block_delta" and chunk.delta.text:
                        yield chunk.delta.text
                        
        except Exception as e:
            logger.error(f"Anthropic stream error: {e}")
            raise


class LLMProviderFactory:
    """
    Factory untuk LLM Provider
    SEMUA DINAMIS! NO HARCODE!
    Priority: Database → .env → Error
    """
    
    def __init__(self, tenant=None, override_api_key: Optional[str] = None, override_model: Optional[str] = None):
        self.tenant = tenant
        self._providers: Dict[str, BaseLLMProvider] = {}
        self._api_key = None
        self.primary_provider = None
        self.model = None 
        
        if tenant:
            if getattr(tenant, "api_key_encrypted", None):
                try:
                    self._api_key = decrypt_api_key(tenant.api_key_encrypted)
                    if self._api_key:
                        logger.info(f"API Key dari database tenant: {tenant.kode_dinas}")
                except Exception as e:
                    logger.warning(f"Gagal dekripsi API Key tenant {tenant.kode_dinas}: {e}")
            
            self.primary_provider = getattr(tenant, "llm_provider", None)
            if self.primary_provider:
                logger.info(f"Provider dari database tenant: {self.primary_provider}")
            
            self.model = getattr(tenant, "llm_model", None)
            if self.model:
                logger.info(f"Model dari database tenant: {self.model}")
        
        if override_api_key:
            self._api_key = override_api_key
            logger.info("API Key dari override parameter")
        
        if override_model:
            self.model = override_model
            logger.info(f"Model dari override parameter: {self.model}")
            if not self.primary_provider:
                self.primary_provider = self._detect_provider_from_model(override_model)
                logger.info(f"Provider auto-detected dari model: {self.primary_provider}")

        if not self._api_key:
            if self.primary_provider == "google_gemini":
                self._api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
            elif self.primary_provider == "openai":
                self._api_key = os.getenv("OPENAI_API_KEY")
            elif self.primary_provider == "anthropic":
                self._api_key = os.getenv("ANTHROPIC_API_KEY")
            else:
                self._api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
            
            if self._api_key:
                logger.info(f"API Key dari .env")
        
        if not self.primary_provider:
            self.primary_provider = settings.DEFAULT_LLM_PROVIDER
            if self.primary_provider:
                logger.info(f"Provider dari .env: {self.primary_provider}")
        
        if not self.model:
            self.model = settings.DEFAULT_LLM_MODEL
            if self.model:
                logger.info(f"Model dari .env: {self.model}")
        
        self._validate_config()
        
        logger.info(f"LLM Factory initialized: provider={self.primary_provider}, model={self.model}, has_key={bool(self._api_key)}")
    
    def _detect_provider_from_model(self, model: str) -> str:
        """Deteksi provider dari nama model"""
        model_lower = model.lower()
        if "gemini" in model_lower:
            return "google_gemini"
        elif "gpt" in model_lower or "o1" in model_lower:
            return "openai"
        elif "claude" in model_lower:
            return "anthropic"
        return settings.DEFAULT_LLM_PROVIDER or "google_gemini"
    
    def _validate_config(self):
        """VALIDASI: Kalo semua kosong, kasih ERROR JELAS!"""
        errors = []
        
        if not self._api_key:
            errors.append("API Key tidak ditemukan! Set di database tenant, atau di .env")
        
        if not self.primary_provider:
            errors.append("Provider tidak ditemukan! Set di database tenant, atau DEFAULT_LLM_PROVIDER di .env")
        
        if not self.model:
            errors.append("Model tidak ditemukan! Set di database tenant, atau DEFAULT_LLM_MODEL di .env")
        
        if errors:
            error_msg = "\n".join(errors)
            logger.error(f"LLM Factory Error:\n{error_msg}")
            raise ValueError(f"""
            KONFIGURASI LLM TIDAK LENGKAP!

            {error_msg}

            SOLUSI:
            Admin Dinas: Setting di menu "Integrasi & Chatbot"
            Super Admin: Setting DEFAULT GLOBAL di "Konfigurasi AI"  
            Developer: Set di .env file

            FORMAT .env:
            Untuk Google Gemini
            GEMINI_API_KEY=

            Untuk OpenAI
            OPENAI_API_KEY=

            Untuk Anthropic Claude
            ANTHROPIC_API_KEY=

            Default Global (FALLBACK)
            DEFAULT_LLM_PROVIDER=google_gemini
            DEFAULT_LLM_MODEL=gemini-3.6-flash
                        """)

    def get_provider(self, provider_name: Optional[str] = None) -> BaseLLMProvider:
        """Get provider instance"""
        provider_name = provider_name or self.primary_provider
        if not provider_name:
            raise ValueError("Provider name tidak boleh kosong!")
        
        provider_name = provider_name.lower().strip()
        
        if provider_name not in self._providers:
            self._providers[provider_name] = self._init_provider(provider_name)
        return self._providers[provider_name]

    def _init_provider(self, name: str) -> BaseLLMProvider:
        """Init provider dengan model dari config (NO HARCODE!)"""
        if name in ['google_gemini', 'gemini']:
            return GeminiProvider(self._api_key, self.model)
        elif name in ['openai', 'gpt']:
            key = self._api_key or os.getenv("OPENAI_API_KEY")
            return OpenAIProvider(key, self.model)
        elif name in ['anthropic_claude', 'claude', 'anthropic']:
            key = self._api_key or os.getenv("ANTHROPIC_API_KEY")
            return AnthropicProvider(key, self.model)
        else:
            raise ValueError(f"Unknown provider: {name}")

    async def generate(self, prompt: str, system_prompt: str = "", **kwargs) -> Tuple[str, str]:
        """Generate response dengan error handling jelas"""
        try:
            provider = self.get_provider(self.primary_provider)
            
            if not provider._available:
                raise Exception(f"Provider {self.primary_provider} tidak tersedia (API Key invalid?)")
            
            kwargs['model'] = self.model
            
            response = await provider.generate(prompt, system_prompt=system_prompt, **kwargs)
            
            if response and len(response.strip()) > 5:
                logger.info(f"LLM Success using provider '{self.primary_provider}' with model '{self.model}'")
                return response, self.primary_provider
            else:
                raise Exception("Empty response dari LLM")
                
        except Exception as e:
            logger.error(f"LLM generate failed: {e}")
            raise Exception(f"Gagal generate response: {str(e)}")
    
    async def generate_stream(self, prompt: str, system_prompt: str = "", **kwargs) -> AsyncGenerator[Tuple[str, str], None]:
        """Streaming dengan error handling jelas"""
        try:
            provider = self.get_provider(self.primary_provider)
            
            if not provider._available:
                raise Exception(f"Provider {self.primary_provider} tidak tersedia (API Key invalid?)")
            

            kwargs['model'] = self.model
            
            async for chunk in provider.generate_stream(prompt, system_prompt=system_prompt, **kwargs):
                yield chunk, self.primary_provider
                
        except Exception as e:
            logger.error(f"LLM stream failed: {e}")
            raise Exception(f"Gagal stream response: {str(e)}")