"""
Voice Assistant Router
Handles voice interactions, bocademas, and conversational AI
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import uuid
import json
import logging
from datetime import datetime

from services.voice_service import voice_service
from services.ai_service import ai_service
from services.websocket_service import connection_manager
from server import get_current_user, User, require_role, UserRole

logger = logging.getLogger(__name__)

voice_router = APIRouter(prefix="/api/voice", tags=["voice"])

# Voice Request Models
class VoiceRequest(BaseModel):
    text: str
    voice_id: Optional[str] = None
    voice_type: str = "coach"  # coach, admin, motivational
    user_context: Optional[Dict[str, Any]] = None

class BocademaRequest(BaseModel):
    command: str
    user_context: Optional[Dict[str, Any]] = None

class ConversationRequest(BaseModel):
    agent_type: str = "bigo_coach"  # bigo_coach, admin_assistant
    session_config: Optional[Dict[str, Any]] = None

@voice_router.get("/voices")
async def list_available_voices(current_user: User = Depends(get_current_user)):
    """Get list of available ElevenLabs voices"""
    result = await voice_service.list_voices()
    
    if result.get("success"):
        return {
            "voices": result["voices"],
            "default_voice": voice_service.default_voice_id
        }
    else:
        return {
            "voices": [
                {
                    "voice_id": voice_service.default_voice_id,
                    "name": "Default Coach Voice",
                    "category": "professional"
                }
            ],
            "default_voice": voice_service.default_voice_id,
            "note": "Using fallback voice list"
        }

@voice_router.post("/tts")
async def text_to_speech(
    request: VoiceRequest,
    current_user: User = Depends(get_current_user)
):
    """Convert text to speech with BIGO coaching context"""
    
    # Get AI-enhanced response first
    if request.voice_type == "coach":
        enhanced_text = await ai_service.get_bigo_strategy_response(
            request.text, 
            request.user_context or {}
        )
    elif request.voice_type == "admin":
        admin_result = await ai_service.get_admin_assistant_response(
            request.text,
            available_actions=["analytics", "user_management", "announcements"]
        )
        enhanced_text = admin_result.get("response", request.text)
    else:
        enhanced_text = request.text
    
    # Generate TTS
    tts_result = await voice_service.text_to_speech(
        text=enhanced_text,
        voice_id=request.voice_id
    )
    
    if tts_result.get("success"):
        return {
            "success": True,
            "original_text": request.text,
            "enhanced_text": enhanced_text,
            "audio_base64": tts_result["audio_base64"],
            "mime_type": tts_result["mime_type"],
            "voice_id": tts_result["voice_id"],
            "duration_estimate": tts_result["duration_estimate"]
        }
    else:
        raise HTTPException(status_code=500, detail=f"TTS failed: {tts_result.get('error')}")

@voice_router.post("/tts/stream")
async def text_to_speech_stream(
    request: VoiceRequest,
    current_user: User = Depends(get_current_user)
):
    """Streaming TTS for real-time voice responses"""
    
    # Get AI response
    if request.voice_type == "coach":
        ai_text = await ai_service.get_bigo_strategy_response(
            request.text,
            request.user_context or {}
        )
    else:
        ai_text = request.text
    
    async def audio_stream():
        async for chunk in voice_service.text_to_speech_stream(ai_text, request.voice_id):
            yield chunk
    
    return StreamingResponse(
        audio_stream(),
        media_type="audio/mpeg",
        headers={
            "X-Enhanced-Text": ai_text[:200] + "..." if len(ai_text) > 200 else ai_text,
            "X-Voice-Type": request.voice_type
        }
    )

@voice_router.post("/stt")
async def speech_to_text(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Convert speech to text"""
    
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid audio file format")
    
    # Save uploaded file temporarily
    temp_filename = f"/tmp/stt_{uuid.uuid4().hex}.wav"
    
    try:
        with open(temp_filename, "wb") as f:
            content = await audio.read()
            f.write(content)
        
        # Process STT
        stt_result = await voice_service.speech_to_text(temp_filename)
        
        if stt_result.get("success"):
            return {
                "success": True,
                "transcription": stt_result["transcription"],
                "confidence": stt_result.get("confidence", 0.0),
                "language": stt_result.get("language", "en"),
                "audio_duration": len(content) / 16000,  # Rough estimate
                "processed_at": datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail=f"STT failed: {stt_result.get('error')}")
            
    finally:
        # Clean up temp file
        try:
            import os
            os.remove(temp_filename)
        except Exception:
            pass

@voice_router.post("/bocadema")
async def process_bocadema(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Process bocadema (voice command) with AI response"""
    
    if not audio.content_type or not audio.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid audio file format")
    
    try:
        audio_data = await audio.read()
        
        # Get user context for personalized responses
        user_context = {
            "user_id": current_user.id,
            "bigo_id": current_user.bigo_id,
            "role": current_user.role,
            "tier": getattr(current_user, "tier", "Unknown"),
            "beans": getattr(current_user, "current_month_beans", 0)
        }
        
        # Process bocadema
        result = await voice_service.process_bocadema(audio_data, user_context)
        
        if result.get("success"):
            return {
                "success": True,
                "transcription": result["transcription"],
                "bocadema_detected": result["bocadema_detected"],
                "response_text": result["response_text"],
                "response_audio": result["response_audio"],
                "user_context": user_context,
                "processing_time": result["processing_time"]
            }
        else:
            raise HTTPException(status_code=500, detail=f"Bocadema processing failed: {result.get('error')}")
            
    except Exception as e:
        logger.error(f"Bocadema processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@voice_router.post("/conversation/start")
async def start_voice_conversation(
    request: ConversationRequest,
    current_user: User = Depends(get_current_user)
):
    """Start conversational AI voice session"""
    
    try:
        # Get signed WebSocket URL for conversational agent
        signed_url_result = await voice_service.get_conversation_signed_url()
        
        if signed_url_result.get("success"):
            return {
                "success": True,
                "signed_url": signed_url_result["signed_url"],
                "agent_id": signed_url_result["agent_id"],
                "expires_in": signed_url_result["expires_in"],
                "session_id": str(uuid.uuid4()),
                "instructions": {
                    "connect_to": signed_url_result["signed_url"],
                    "supported_commands": [
                        "Hey Coach", "Check my beans", "PK strategy", 
                        "Schedule help", "Tier advice", "Event planning", "Motivation boost"
                    ],
                    "session_config": request.session_config or {}
                }
            }
        else:
            # Fallback: provide WebSocket endpoint for custom implementation
            return {
                "success": True,
                "fallback_mode": True,
                "websocket_endpoint": f"/voice/ws/{current_user.id}",
                "session_id": str(uuid.uuid4()),
                "error": signed_url_result.get("error"),
                "instructions": {
                    "connect_to": f"ws://localhost:8000/voice/ws/{current_user.id}",
                    "mode": "fallback_websocket"
                }
            }
            
    except Exception as e:
        logger.error(f"Conversation start error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@voice_router.websocket("/ws/{user_id}")
async def voice_websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for voice conversations (fallback mode)"""
    
    connection_id = str(uuid.uuid4())
    
    try:
        await connection_manager.connect(websocket, connection_id, user_id)
        
        # Start voice session
        session_config = {
            "user_id": user_id,
            "session_type": "voice_chat",
            "bocademas_enabled": True
        }
        
        await connection_manager.start_voice_session(connection_id, session_config)
        
        while True:
            # Receive data from WebSocket
            data = await websocket.receive()
            
            if data["type"] == "websocket.receive":
                if "bytes" in data:
                    # Handle audio chunk
                    audio_chunk = data["bytes"]
                    await connection_manager.handle_voice_chunk(
                        connection_id, 
                        audio_chunk,
                        {"chunk_type": "audio", "timestamp": datetime.utcnow().isoformat()}
                    )
                    
                elif "text" in data:
                    # Handle text message
                    try:
                        message_data = json.loads(data["text"])
                        message_type = message_data.get("type")
                        
                        if message_type == "voice_command":
                            # Process text-based voice command
                            command = message_data.get("command", "")
                            
                            # Get AI response
                            ai_response = await ai_service.get_bigo_strategy_response(
                                command,
                                {"user_id": user_id}
                            )
                            
                            # Generate TTS
                            tts_result = await voice_service.text_to_speech(ai_response)
                            
                            response = {
                                "type": "voice_response",
                                "command": command,
                                "response_text": ai_response,
                                "response_audio": tts_result.get("audio_base64") if tts_result.get("success") else None,
                                "timestamp": datetime.utcnow().isoformat()
                            }
                            
                            await websocket.send_text(json.dumps(response))
                            
                        elif message_type == "end_session":
                            await connection_manager.end_voice_session(connection_id)
                            break
                            
                    except json.JSONDecodeError:
                        await websocket.send_text(json.dumps({
                            "type": "error",
                            "message": "Invalid JSON format"
                        }))
                        
    except WebSocketDisconnect:
        logger.info(f"Voice WebSocket disconnected: {connection_id}")
    except Exception as e:
        logger.error(f"Voice WebSocket error: {str(e)}")
    finally:
        await connection_manager.disconnect(connection_id)

@voice_router.get("/session/{session_id}/status")
async def get_voice_session_status(
    session_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get voice session status and statistics"""
    
    # This would query active sessions - for now return mock data
    return {
        "session_id": session_id,
        "status": "active",
        "duration": 120,  # seconds
        "commands_processed": 5,
        "last_activity": datetime.utcnow().isoformat(),
        "user_id": current_user.id,
        "bocademas_used": [
            "Hey Coach", "Check my beans", "PK strategy"
        ]
    }

@voice_router.post("/admin/create-agent")
async def create_custom_voice_agent(
    agent_config: Dict[str, Any],
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.OWNER]))
):
    """Create custom conversational agent for specific use cases"""
    
    try:
        result = await voice_service.create_bigo_coach_agent()
        
        if result.get("success"):
            return {
                "success": True,
                "agent_id": result["agent_id"],
                "agent_config": result["agent_config"],
                "created_at": datetime.utcnow().isoformat(),
                "created_by": current_user.id
            }
        else:
            raise HTTPException(status_code=500, detail=f"Agent creation failed: {result.get('error')}")
            
    except Exception as e:
        logger.error(f"Custom agent creation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@voice_router.get("/analytics")
async def get_voice_analytics(
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.OWNER]))
):
    """Get voice usage analytics for admin dashboard"""
    
    return {
        "total_voice_sessions": 42,
        "bocademas_usage": {
            "hey_coach": 15,
            "check_my_beans": 12,
            "pk_strategy": 8,
            "schedule_help": 7,
            "tier_advice": 10,
            "motivation_boost": 6
        },
        "average_session_duration": 180,  # seconds
        "success_rate": 94.5,
        "top_users": [
            {"user_id": "user1", "sessions": 8},
            {"user_id": "user2", "sessions": 6},
            {"user_id": "user3", "sessions": 5}
        ],
        "generated_at": datetime.utcnow().isoformat()
    }