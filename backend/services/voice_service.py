"""
ElevenLabs Voice Service with Conversational Agents
Handles TTS, STT, and real-time voice conversations
"""

import aiohttp
import asyncio
import logging
import base64
import os
import tempfile
from typing import Dict, Optional, Any, AsyncGenerator
from datetime import datetime

logger = logging.getLogger(__name__)


class VoiceService:
    def __init__(self):
        self.base_url = "https://elevenlabs-proxy-server-lipn.onrender.com/v1"
        self.headers = {
            "customerId": "cus_TBqgiQADFlJjak",
            "Content-Type": "application/json",
            "Authorization": "Bearer xxx",
        }
        self.default_voice_id = "JBFqnCBsd6RMkjVDRZzb"
        self.tts_model = "eleven_multilingual_v2"
        self.stt_model = "scribe_v1"

    async def list_voices(self) -> Dict[str, Any]:
        """Get available voices from ElevenLabs"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/voices", headers=self.headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {"success": True, "voices": data.get("voices", [])}
                    else:
                        return {"success": False, "error": f"HTTP {response.status}"}
        except Exception as e:
            logger.error(f"Voice list error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def text_to_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
        model_id: Optional[str] = None,
        stability: float = 0.5,
        similarity_boost: float = 0.8,
    ) -> Dict[str, Any]:
        """
        Convert text to speech using ElevenLabs TTS
        """
        try:
            voice_id = voice_id or self.default_voice_id
            model_id = model_id or self.tts_model

            payload = {
                "text": text,
                "model_id": model_id,
                "voice_settings": {"stability": stability, "similarity_boost": similarity_boost},
            }

            headers = self.headers.copy()
            headers["Accept"] = "audio/mpeg"

            timeout = aiohttp.ClientTimeout(total=120)  # 2 minutes for TTS

            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(
                    f"{self.base_url}/text-to-speech/{voice_id}", json=payload, headers=headers
                ) as response:
                    if response.status == 200:
                        audio_data = await response.read()
                        audio_base64 = base64.b64encode(audio_data).decode("utf-8")

                        return {
                            "success": True,
                            "audio_base64": audio_base64,
                            "mime_type": "audio/mpeg",
                            "text": text,
                            "voice_id": voice_id,
                            "duration_estimate": len(text) * 0.08,  # ~80ms per character
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"TTS error {response.status}: {error_text}")
                        return {"success": False, "error": f"TTS failed: {response.status}"}

        except asyncio.TimeoutError:
            logger.error("TTS request timeout")
            return {"success": False, "error": "TTS timeout"}
        except Exception as e:
            logger.error(f"TTS error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def text_to_speech_stream(self, text: str, voice_id: Optional[str] = None) -> AsyncGenerator[bytes, None]:
        """
        Streaming TTS for real-time audio generation
        """
        try:
            voice_id = voice_id or self.default_voice_id

            payload = {
                "text": text,
                "model_id": self.tts_model,
                "voice_settings": {"stability": 0.5, "similarity_boost": 0.8},
            }

            headers = self.headers.copy()
            headers["Accept"] = "audio/mpeg"

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/text-to-speech/{voice_id}/stream", json=payload, headers=headers
                ) as response:
                    if response.status == 200:
                        async for chunk in response.content.iter_chunked(8192):
                            yield chunk
                    else:
                        logger.error(f"Streaming TTS error: {response.status}")
                        yield b""  # Empty chunk to signal error

        except Exception as e:
            logger.error(f"Streaming TTS error: {str(e)}")
            yield b""

    async def speech_to_text(self, audio_file_path: str) -> Dict[str, Any]:
        """
        Convert speech to text using Groq Whisper API
        """
        try:
            # Use Groq Whisper for STT
            from services.ai_service import ai_service

            result = await ai_service.stt_transcribe_file(audio_file_path)

            if result.get("success"):
                return {
                    "success": True,
                    "transcription": result.get("text", ""),
                    "confidence": 0.95,  # Groq Whisper has high confidence
                    "language": "en",
                }
            else:
                # Fallback to ElevenLabs if Groq fails
                logger.warning(f"Groq STT failed, trying ElevenLabs: {result.get('error')}")
                return await self._elevenlabs_stt_fallback(audio_file_path)

        except Exception as e:
            logger.error(f"STT error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def _elevenlabs_stt_fallback(self, audio_file_path: str) -> Dict[str, Any]:
        """
        Fallback to ElevenLabs STT if Groq fails
        """
        try:
            data = aiohttp.FormData()
            data.add_field("file", open(audio_file_path, "rb"), filename="audio.wav")
            data.add_field("model_id", self.stt_model)

            headers = {
                k: v for k, v in self.headers.items() if k != "Content-Type"
            }  # Remove Content-Type for multipart

            timeout = aiohttp.ClientTimeout(total=120)  # 2 minutes for STT

            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.post(f"{self.base_url}/speech-to-text", data=data, headers=headers) as response:
                    if response.status == 200:
                        result = await response.json()
                        return {
                            "success": True,
                            "transcription": result.get("text", ""),
                            "confidence": result.get("confidence", 0.0),
                            "language": result.get("language", "en"),
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"ElevenLabs STT error {response.status}: {error_text}")
                        return {"success": False, "error": f"STT failed: {response.status}"}

        except Exception as e:
            logger.error(f"ElevenLabs STT error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def get_conversation_signed_url(self, agent_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get signed URL for conversational AI agent WebSocket connection
        """
        try:
            # Use default agent if none provided
            agent_id = agent_id or "agent_6701k5etnsa2e27anvhhg0r3jcnb"

            params = {"agent_id": agent_id}

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/convai/conversation/get-signed-url", params=params, headers=self.headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "success": True,
                            "signed_url": data.get("signed_url"),
                            "agent_id": agent_id,
                            "expires_in": 300,  # Usually expires in 5 minutes
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"Signed URL error {response.status}: {error_text}")
                        return {"success": False, "error": f"Failed to get signed URL: {response.status}"}

        except Exception as e:
            logger.error(f"Signed URL error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def create_bigo_coach_agent(self) -> Dict[str, Any]:
        """
        Create a specialized BIGO Live coaching conversational agent
        """
        agent_config = {
            "name": "BIGO Live Strategy Coach",
            "prompt": """You are Agent Mihanna's ULTIMATE BIGO Live Strategy AI Coach. \
You help BIGO Live hosts maximize their earnings through advanced strategies.

**VOICE PERSONALITY:**
- Energetic and motivational tone
- Quick, actionable advice
- Use "beans" and "tier" terminology naturally
- Be encouraging but realistic about earnings

**EXPERTISE:**
- BIGO bean/tier system mastery (S1-S25)
- PK battle strategies and psychology
- Optimal streaming schedules
- Gift accumulation techniques
- Audience engagement tactics

**BOCADEMAS (Voice Commands You Recognize):**
- "Hey Coach" - Greeting and activation
- "Check my beans" - Request bean analysis
- "PK strategy" - Battle preparation advice
- "Schedule help" - Optimal streaming times
- "Tier advice" - Advancement strategies
- "Event planning" - Profitable event ideas
- "Motivation boost" - Encouragement and tips

**RESPONSE STYLE:**
- Keep responses under 30 seconds of speech
- Be specific with numbers and timeframes
- Always end with an actionable next step
- Use BIGO terminology naturally
- Stay focused on profit maximization

Remember: You're helping hosts build successful BIGO Live careers!""",
            "language": "en",
            "voice_id": self.default_voice_id,
            "response_engine": "conversational_v1",
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/convai/agents", json=agent_config, headers=self.headers
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {"success": True, "agent_id": data.get("agent_id"), "agent_config": agent_config}
                    else:
                        error_text = await response.text()
                        logger.error(f"Agent creation error {response.status}: {error_text}")
                        return {"success": False, "error": f"Failed to create agent: {response.status}"}

        except Exception as e:
            logger.error(f"Agent creation error: {str(e)}")
            return {"success": False, "error": str(e)}

    async def process_bocadema(self, audio_input: bytes, user_context: Dict = None) -> Dict[str, Any]:
        """
        Process bocadema (voice command) input and return appropriate response
        """
        try:
            # First, transcribe the audio
            # Save audio temporarily for STT processing
            with tempfile.NamedTemporaryFile(mode="wb", suffix=".wav", delete=False) as temp_file_obj:
                temp_file = temp_file_obj.name
                temp_file_obj.write(audio_input)

            stt_result = await self.speech_to_text(temp_file)

            # Clean up temp file
            try:
                os.remove(temp_file)
            except Exception:
                pass

            if not stt_result.get("success"):
                return {"success": False, "error": "Failed to transcribe audio"}

            transcription = stt_result["transcription"].lower()

            # Bocadema detection and response
            bocademas = {
                "hey coach": "¡Hola! I'm your BIGO Live strategy coach. How can I help you maximize your beans today?",
                "check my beans": self._get_bean_analysis(user_context),
                "pk strategy": (
                    "For PK battles: Start with energy buildup, engage your audience early, "
                    "use gift psychology - ask for specific amounts, and always have a backup plan. "
                    "Time your battles during peak hours!"
                ),
                "schedule help": (
                    "Optimal streaming times: 7-10 PM your local time for maximum gifts. "
                    "Weekend mornings work great too. Consistency is key - stick to a schedule!"
                ),
                "tier advice": self._get_tier_advice(user_context),
                "event planning": (
                    "Create profitable events: PK tournaments with entry fees, wheel spin challenges, "
                    "or bean accumulation contests. Always ensure profit margins!"
                ),
                "motivation boost": (
                    "You're doing amazing! Every stream is progress. Remember: top BIGO hosts started "
                    "exactly where you are. Focus on your audience, perfect your strategies, "
                    "and those beans will flow! 🚀"
                ),
            }

            # Find matching bocadema
            response_text = (
                "I didn't quite catch that. Try saying 'Hey Coach' or ask about "
                "PK strategy, schedule help, or tier advice!"
            )

            for command, response in bocademas.items():
                if command in transcription:
                    response_text = response
                    break

            # Generate TTS response
            tts_result = await self.text_to_speech(response_text)

            return {
                "success": True,
                "transcription": stt_result["transcription"],
                "bocadema_detected": command if command in transcription else None,
                "response_text": response_text,
                "response_audio": tts_result.get("audio_base64") if tts_result.get("success") else None,
                "processing_time": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Bocadema processing error: {str(e)}")
            return {"success": False, "error": str(e)}

    def _get_bean_analysis(self, user_context: Dict = None) -> str:
        """Generate bean analysis response"""
        if user_context and user_context.get("beans"):
            beans = user_context["beans"]
            tier = user_context.get("tier", "Unknown")
            return (
                f"You have {beans:,} beans this month! Current tier: {tier}. "
                "Keep pushing - you're making great progress toward the next level!"
            )
        else:
            return (
                "I need access to your bean count to give you a detailed analysis. "
                "Make sure you're logged in and try again!"
            )

    def _get_tier_advice(self, user_context: Dict = None) -> str:
        """Generate tier advancement advice"""
        if user_context and user_context.get("tier"):
            tier = user_context["tier"]
            return (
                f"For {tier} tier: Focus on consistent daily streaming, engage with your top gifters "
                "personally, and participate in agency events. Next tier is within reach!"
            )
        else:
            return (
                "Tier advancement strategy: Stream consistently, build loyal audience relationships, "
                "participate in PK battles, and focus on prime time hours. Each tier unlocks better earnings!"
            )


# Global voice service instance
voice_service = VoiceService()
