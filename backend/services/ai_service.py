"""
Centralized AI Service using Groq API
Handles Chat, TTS, Transcriptions, and Models via REST
With Dynamic API Key Management
"""

import aiohttp
import asyncio
import base64
import logging
from typing import Dict, List, Optional, Any
import os

logger = logging.getLogger(__name__)

GROQ_BASE = "https://api.groq.com/openai/v1"

class AIService:
    def __init__(self):
        self.chat_url = f"{GROQ_BASE}/chat/completions"
        self.tts_url = f"{GROQ_BASE}/audio/speech"
        self.stt_url = f"{GROQ_BASE}/audio/transcriptions"
        self.models_url = f"{GROQ_BASE}/models"
        # Default models
        self.default_chat_model = "llama-3.3-70b-versatile"
        self.default_tts_model = "playai-tts"
        self.default_tts_voice = "Fritz-PlayAI"
        self.default_stt_model = "whisper-large-v3"
        # DB reference will be set externally
        self.db = None
        self._api_key_cache = None
        self._cache_time = None
    
    def set_db(self, db):
        """Set database reference for dynamic key loading"""
        self.db = db
    
    async def get_api_key(self) -> str:
        """Get API key from DB with fallback to env, with 60s cache"""
        # Check cache (60 second TTL)
        import time
        now = time.time()
        if self._api_key_cache and self._cache_time and (now - self._cache_time < 60):
            return self._api_key_cache
        
        # Try to get from database first
        if self.db is not None:
            try:
                settings_doc = await self.db.settings.find_one({"key": "groq_api_key"})
                if settings_doc and settings_doc.get("value"):
                    self._api_key_cache = settings_doc["value"]
                    self._cache_time = now
                    return self._api_key_cache
            except Exception as e:
                logger.warning(f"Failed to load API key from DB: {e}")
        
        # Fallback to environment variable
        env_key = os.environ.get("GROQ_API_KEY", "")
        self._api_key_cache = env_key
        self._cache_time = now
        return env_key
    
    def clear_key_cache(self):
        """Clear API key cache to force reload"""
        self._api_key_cache = None
        self._cache_time = None
    
    async def get_headers_json(self) -> Dict[str, str]:
        """Get headers with current API key"""
        api_key = await self.get_api_key()
        return {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
    
    async def get_headers_auth_only(self) -> Dict[str, str]:
        """Get auth-only headers with current API key"""
        api_key = await self.get_api_key()
        return {
            "Authorization": f"Bearer {api_key}",
        }

    async def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_completion_tokens: Optional[int] = 1024,
        timeout: int = 60,
        stream: bool = False,
    ) -> Dict[str, Any]:
        try:
            headers = await self.get_headers_json()
            payload = {
                "model": model or self.default_chat_model,
                "messages": messages,
                "temperature": temperature,
            }
            if max_completion_tokens is not None:
                payload["max_completion_tokens"] = max_completion_tokens
            if stream:
                payload["stream"] = True

            timeout_config = aiohttp.ClientTimeout(total=timeout)
            async with aiohttp.ClientSession(timeout=timeout_config) as session:
                async with session.post(self.chat_url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        content = (
                            data.get("choices", [{}])[0]
                            .get("message", {})
                            .get("content", "")
                        )
                        return {
                            "success": True,
                            "content": content,
                            "model": payload["model"],
                            "usage": data.get("usage", {}),
                        }
                    else:
                        err = await response.text()
                        logger.error(f"Groq chat error {response.status}: {err}")
                        return {"success": False, "error": f"API error: {response.status}", "details": err}
        except asyncio.TimeoutError:
            logger.error(f"Groq chat timeout after {timeout}s")
            return {"success": False, "error": "Request timeout"}
        except Exception as e:
            logger.error(f"Groq chat exception: {e}")
            return {"success": False, "error": str(e)}

    async def tts_generate(self, text: str, voice: Optional[str] = None, response_format: str = "wav") -> Dict[str, Any]:
        try:
            payload = {
                "model": self.default_tts_model,
                "input": text,
                "voice": voice or self.default_tts_voice,
                "response_format": response_format,
            }
            async with aiohttp.ClientSession() as session:
                async with session.post(self.tts_url, headers=self.headers_json, json=payload) as r:
                    if r.status != 200:
                        detail = await r.text()
                        logger.error(f"Groq TTS error {r.status}: {detail}")
                        return {"success": False, "error": detail}
                    data = await r.read()
                    audio_b64 = base64.b64encode(data).decode("utf-8")
                    mime = f"audio/{'wav' if response_format=='wav' else response_format}"
                    return {"success": True, "audio_base64": audio_b64, "mime": mime}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def stt_transcribe_file(self, file_path: str, model: Optional[str] = None) -> Dict[str, Any]:
        try:
            form = aiohttp.FormData()
            form.add_field("file", open(file_path, "rb"), filename=os.path.basename(file_path))
            form.add_field("model", model or self.default_stt_model)
            async with aiohttp.ClientSession() as session:
                async with session.post(self.stt_url, headers=self.headers_auth_only, data=form) as r:
                    if r.status != 200:
                        detail = await r.text()
                        logger.error(f"Groq STT error {r.status}: {detail}")
                        return {"success": False, "error": detail}
                    data = await r.json()
                    return {"success": True, "text": data.get("text", "")}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def list_models(self) -> Dict[str, Any]:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.models_url, headers=self.headers_auth_only) as r:
                    if r.status != 200:
                        detail = await r.text()
                        logger.error(f"Groq models error {r.status}: {detail}")
                        return {"success": False, "error": detail}
                    data = await r.json()
                    return {"success": True, "data": data.get("data", [])}
        except Exception as e:
            return {"success": False, "error": str(e)}

# Global AI service instance
ai_service = AIService()
