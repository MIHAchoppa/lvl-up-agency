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
            headers = await self.get_headers_json()
            payload = {
                "model": self.default_tts_model,
                "input": text,
                "voice": voice or self.default_tts_voice,
                "response_format": response_format,
            }
            async with aiohttp.ClientSession() as session:
                async with session.post(self.tts_url, headers=headers, json=payload) as r:
                    if r.status != 200:
                        detail = await r.text()
                        logger.error(f"Groq TTS error {r.status}: {detail}")
                        return {"success": False, "error": detail}
                    data = await r.read()
                    audio_b64 = base64.b64encode(data).decode("utf-8")
                    mime = f"audio/{'wav' if response_format == 'wav' else response_format}"
                    return {"success": True, "audio_base64": audio_b64, "mime": mime}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def stt_transcribe_file(self, file_path: str, model: Optional[str] = None) -> Dict[str, Any]:
        try:
            headers = await self.get_headers_auth_only()
            form = aiohttp.FormData()
            form.add_field("file", open(file_path, "rb"), filename=os.path.basename(file_path))
            form.add_field("model", model or self.default_stt_model)
            async with aiohttp.ClientSession() as session:
                async with session.post(self.stt_url, headers=headers, data=form) as r:
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
            headers = await self.get_headers_auth_only()
            async with aiohttp.ClientSession() as session:
                async with session.get(self.models_url, headers=headers) as r:
                    if r.status != 200:
                        detail = await r.text()
                        logger.error(f"Groq models error {r.status}: {detail}")
                        return {"success": False, "error": detail}
                    data = await r.json()
                    return {"success": True, "data": data.get("data", [])}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    async def get_memory_context(self, user_id: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Get conversation memory for context - token efficient"""
        if self.db is None:
            return {"messages": [], "summary": None}
        
        try:
            # Get long-term memory summary
            memory_doc = await self.db.memories.find_one({"user_id": user_id})
            long_term_summary = memory_doc.get("summary") if memory_doc else None
            
            # Get recent conversation (last 5 messages)
            if session_id:
                conv_doc = await self.db.conversations.find_one({"session_id": session_id, "user_id": user_id})
                if conv_doc:
                    messages = conv_doc.get("messages", [])[-5:]  # Last 5 messages only
                    return {
                        "messages": messages,
                        "summary": conv_doc.get("summary"),
                        "long_term_summary": long_term_summary
                    }
            
            return {"messages": [], "summary": None, "long_term_summary": long_term_summary}
        except Exception as e:
            logger.error(f"Error loading memory: {e}")
            return {"messages": [], "summary": None}
    
    async def save_conversation_turn(self, user_id: str, session_id: str, user_msg: str, ai_msg: str):
        """Save conversation turn and compress if needed"""
        if self.db is None:
            return
        
        try:
            from datetime import datetime, timezone
            turn = {
                "role": "user",
                "content": user_msg,
                "timestamp": datetime.now(timezone.utc)
            }
            ai_turn = {
                "role": "assistant",
                "content": ai_msg,
                "timestamp": datetime.now(timezone.utc)
            }
            
            # Update conversation
            result = await self.db.conversations.update_one(
                {"session_id": session_id, "user_id": user_id},
                {
                    "$push": {"messages": {"$each": [turn, ai_turn]}},
                    "$set": {"updated_at": datetime.now(timezone.utc)}
                },
                upsert=True
            )
            
            # Check if we need to compress (>10 messages)
            conv = await self.db.conversations.find_one({"session_id": session_id})
            if conv and len(conv.get("messages", [])) > 10:
                await self._compress_conversation(session_id, user_id)
        except Exception as e:
            logger.error(f"Error saving conversation: {e}")
    
    async def _compress_conversation(self, session_id: str, user_id: str):
        """Compress old messages into summary"""
        try:
            conv = await self.db.conversations.find_one({"session_id": session_id})
            if not conv:
                return
            
            messages = conv.get("messages", [])
            if len(messages) <= 10:
                return
            
            # Take first 5 messages to summarize
            to_summarize = messages[:5]
            keep_recent = messages[5:]
            
            # Create summary prompt
            conversation_text = "\n".join([f"{m['role']}: {m['content']}" for m in to_summarize])
            summary_prompt = f"Summarize this conversation concisely (2-3 sentences max):\n\n{conversation_text}"
            
            result = await self.chat_completion(
                messages=[{"role": "user", "content": summary_prompt}],
                max_completion_tokens=150,
                temperature=0.3
            )
            
            if result.get("success"):
                summary = result.get("content", "")
                # Update conversation with summary and keep only recent messages
                await self.db.conversations.update_one(
                    {"session_id": session_id},
                    {
                        "$set": {
                            "messages": keep_recent,
                            "summary": (conv.get("summary", "") + " " + summary).strip()
                        }
                    }
                )
                logger.info(f"Compressed conversation {session_id}")
        except Exception as e:
            logger.error(f"Error compressing conversation: {e}")
    
    async def ai_assist(self, field_name: str, current_value: str, context: Dict[str, Any], mode: str = "fill") -> Dict[str, Any]:
        """AI assist for filling or improving input fields"""
        try:
            if mode == "fill":
                prompt = f"Generate content for the field '{field_name}'. Context: {context}. Be concise and relevant."
            else:  # improve
                prompt = f"Improve this content for '{field_name}': '{current_value}'. Context: {context}. Make it more professional and engaging while keeping the same meaning."
            
            result = await self.chat_completion(
                messages=[{"role": "user", "content": prompt}],
                max_completion_tokens=300,
                temperature=0.7
            )
            
            if result.get("success"):
                return {
                    "success": True,
                    "suggested_text": result.get("content", "").strip()
                }
            else:
                return {"success": False, "error": result.get("error")}
        except Exception as e:
            logger.error(f"AI assist error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_bigo_strategy_response(self, query: str, user_context: Dict[str, Any] = None) -> str:
        """Get BIGO Live strategy advice from AI"""
        try:
            context_str = ""
            if user_context:
                tier = user_context.get("tier", "Unknown")
                beans = user_context.get("beans", 0)
                context_str = f"\nUser Context: Tier {tier}, {beans} beans this month."
            
            system_prompt = """You are a BIGO Live strategy expert coach. Provide actionable advice on:
- Bean/tier system optimization (S1-S25)
- PK battle strategies
- Streaming schedules and timing
- Gift accumulation techniques
- Audience engagement tactics

Keep responses concise, motivational, and focused on profit maximization."""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query + context_str}
            ]
            
            result = await self.chat_completion(
                messages=messages,
                max_completion_tokens=500,
                temperature=0.7
            )
            
            if result.get("success"):
                return result.get("content", "I'm here to help with BIGO Live strategies!")
            else:
                return "Strategy advice temporarily unavailable. Please try again."
        except Exception as e:
            logger.error(f"BIGO strategy error: {e}")
            return "Unable to provide strategy advice at the moment."
    
    async def get_admin_assistant_response(self, message: str, available_actions: List[str] = None) -> Dict[str, Any]:
        """Get admin assistant response with action detection"""
        try:
            system_prompt = f"""You are an AI admin assistant for a BIGO Live agency platform. 
Help admins manage the platform through natural language commands.

Available actions: {', '.join(available_actions or [])}

Respond helpfully and suggest actions when appropriate. Detect if the user wants to:
- Create announcements or events
- Analyze user data or performance
- Manage users or settings
- Generate reports

Be concise and actionable."""
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ]
            
            result = await self.chat_completion(
                messages=messages,
                max_completion_tokens=500,
                temperature=0.7
            )
            
            if result.get("success"):
                response_text = result.get("content", "")
                
                # Simple action detection
                detected_action = None
                requires_confirmation = False
                
                message_lower = message.lower()
                if "announce" in message_lower or "announcement" in message_lower:
                    detected_action = "system_announcement"
                    requires_confirmation = True
                elif "event" in message_lower and "create" in message_lower:
                    detected_action = "create_event"
                    requires_confirmation = True
                elif "user" in message_lower and ("analytics" in message_lower or "report" in message_lower):
                    detected_action = "user_analytics"
                
                return {
                    "success": True,
                    "response": response_text,
                    "detected_action": detected_action,
                    "requires_confirmation": requires_confirmation
                }
            else:
                return {
                    "success": False,
                    "response": "Admin assistant temporarily unavailable.",
                    "error": result.get("error")
                }
        except Exception as e:
            logger.error(f"Admin assistant error: {e}")
            return {
                "success": False,
                "response": "An error occurred processing your request.",
                "error": str(e)
            }
    
    async def generate_announcement_content(
        self, 
        announcement_type: str, 
        target_audience: str, 
        key_message: str
    ) -> str:
        """Generate AI-powered announcement content"""
        try:
            prompt = f"""Create an engaging announcement for a BIGO Live agency platform.

Type: {announcement_type}
Target Audience: {target_audience}
Key Message: {key_message}

Requirements:
- Professional yet friendly tone
- Motivational and encouraging
- Include relevant emojis
- Keep it concise (2-3 sentences max)
- Make it actionable

Generate only the announcement text, no additional commentary."""
            
            messages = [{"role": "user", "content": prompt}]
            
            result = await self.chat_completion(
                messages=messages,
                max_completion_tokens=300,
                temperature=0.8
            )
            
            if result.get("success"):
                return result.get("content", "").strip()
            else:
                # Fallback content
                return f"{key_message} 🚀 Let's keep pushing forward together!"
        except Exception as e:
            logger.error(f"Announcement generation error: {e}")
            return f"{key_message} Stay tuned for more updates!"

# Global AI service instance
ai_service = AIService()
