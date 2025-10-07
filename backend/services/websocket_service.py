"""
WebSocket Service for Real-time Communication
Handles voice chat, messaging, and live updates
"""

import asyncio
import json
import logging
import uuid
from typing import Dict, List, Optional, Set
from datetime import datetime
from fastapi import WebSocket
from collections import defaultdict

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections for real-time features"""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, str] = {}  # user_id -> connection_id
        self.room_connections: Dict[str, Set[str]] = defaultdict(set)  # room -> connection_ids
        self.voice_sessions: Dict[str, Dict] = {}  # connection_id -> voice session info
        
    async def connect(self, websocket: WebSocket, connection_id: str, user_id: str = None):
        """Accept new WebSocket connection"""
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        
        if user_id:
            self.user_connections[user_id] = connection_id
            
        logger.info(f"WebSocket connected: {connection_id} (user: {user_id})")
        
    async def disconnect(self, connection_id: str):
        """Handle WebSocket disconnection"""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
            
        # Remove from user mapping
        user_id = None
        for uid, cid in list(self.user_connections.items()):
            if cid == connection_id:
                user_id = uid
                del self.user_connections[uid]
                break
                
        # Remove from rooms
        for room_id in list(self.room_connections.keys()):
            self.room_connections[room_id].discard(connection_id)
            if not self.room_connections[room_id]:
                del self.room_connections[room_id]
                
        # Clean up voice session
        if connection_id in self.voice_sessions:
            del self.voice_sessions[connection_id]
            
        logger.info(f"WebSocket disconnected: {connection_id} (user: {user_id})")

    async def send_personal_message(self, message: dict, connection_id: str):
        """Send message to specific connection"""
        if connection_id in self.active_connections:
            try:
                websocket = self.active_connections[connection_id]
                await websocket.send_text(json.dumps(message))
                return True
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                await self.disconnect(connection_id)
                return False
        return False

    async def send_user_message(self, message: dict, user_id: str):
        """Send message to specific user"""
        if user_id in self.user_connections:
            connection_id = self.user_connections[user_id]
            return await self.send_personal_message(message, connection_id)
        return False

    async def join_room(self, connection_id: str, room_id: str):
        """Add connection to a room"""
        if connection_id in self.active_connections:
            self.room_connections[room_id].add(connection_id)
            await self.send_personal_message({
                "type": "room_joined",
                "room_id": room_id,
                "timestamp": datetime.utcnow().isoformat()
            }, connection_id)
            
    async def leave_room(self, connection_id: str, room_id: str):
        """Remove connection from room"""
        self.room_connections[room_id].discard(connection_id)
        if not self.room_connections[room_id]:
            del self.room_connections[room_id]
            
    async def broadcast_to_room(self, message: dict, room_id: str, exclude_connection: str = None):
        """Send message to all connections in a room"""
        if room_id not in self.room_connections:
            return 0
            
        connections = self.room_connections[room_id].copy()
        if exclude_connection:
            connections.discard(exclude_connection)
            
        sent_count = 0
        for connection_id in list(connections):
            if await self.send_personal_message(message, connection_id):
                sent_count += 1
        
        return sent_count

    async def broadcast_to_all(self, message: dict):
        """Send message to all active connections"""
        sent_count = 0
        for connection_id in list(self.active_connections.keys()):
            if await self.send_personal_message(message, connection_id):
                sent_count += 1
        return sent_count

    async def start_voice_session(self, connection_id: str, session_config: dict):
        """Initialize voice chat session"""
        if connection_id in self.active_connections:
            session_id = str(uuid.uuid4())
            
            self.voice_sessions[connection_id] = {
                "session_id": session_id,
                "started_at": datetime.utcnow(),
                "config": session_config,
                "status": "active",
                "audio_chunks": [],
                "transcriptions": []
            }
            
            await self.send_personal_message({
                "type": "voice_session_started",
                "session_id": session_id,
                "config": session_config,
                "timestamp": datetime.utcnow().isoformat()
            }, connection_id)
            
            return session_id
        return None

    async def handle_voice_chunk(self, connection_id: str, audio_chunk: bytes, chunk_metadata: dict = None):
        """Process incoming voice audio chunk"""
        if connection_id not in self.voice_sessions:
            return False
            
        session = self.voice_sessions[connection_id]
        
        # Store audio chunk
        chunk_info = {
            "data": audio_chunk,
            "metadata": chunk_metadata or {},
            "received_at": datetime.utcnow(),
            "chunk_index": len(session["audio_chunks"])
        }
        
        session["audio_chunks"].append(chunk_info)
        
        # Process chunk (implement voice processing logic here)
        await self._process_voice_chunk(connection_id, chunk_info)
        
        return True

    async def _process_voice_chunk(self, connection_id: str, chunk_info: dict):
        """Process voice chunk for transcription and response"""
        try:
            # This would integrate with voice_service for real processing
            # For now, send acknowledgment
            await self.send_personal_message({
                "type": "voice_chunk_processed",
                "chunk_index": chunk_info["chunk_index"],
                "status": "received",
                "timestamp": datetime.utcnow().isoformat()
            }, connection_id)
            
        except Exception as e:
            logger.error(f"Voice chunk processing error: {e}")
            await self.send_personal_message({
                "type": "voice_error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }, connection_id)

    async def end_voice_session(self, connection_id: str):
        """End voice chat session"""
        if connection_id in self.voice_sessions:
            session = self.voice_sessions[connection_id]
            session["status"] = "ended"
            session["ended_at"] = datetime.utcnow()
            
            # Generate session summary
            duration = (session["ended_at"] - session["started_at"]).total_seconds()
            chunk_count = len(session["audio_chunks"])
            
            await self.send_personal_message({
                "type": "voice_session_ended",
                "session_id": session["session_id"],
                "summary": {
                    "duration_seconds": duration,
                    "audio_chunks": chunk_count,
                    "transcriptions": len(session["transcriptions"])
                },
                "timestamp": datetime.utcnow().isoformat()
            }, connection_id)
            
            # Clean up session after summary
            del self.voice_sessions[connection_id]

    async def handle_chat_message(self, connection_id: str, message_data: dict):
        """Handle incoming chat message"""
        try:
            room_id = message_data.get("room_id", "general")
            message_text = message_data.get("message", "")
            user_id = message_data.get("user_id")
            
            if not message_text.strip():
                return
                
            # Broadcast message to room
            broadcast_message = {
                "type": "chat_message",
                "room_id": room_id,
                "user_id": user_id,
                "message": message_text,
                "timestamp": datetime.utcnow().isoformat(),
                "message_id": str(uuid.uuid4())
            }
            
            sent_count = await self.broadcast_to_room(
                broadcast_message, 
                room_id, 
                exclude_connection=connection_id
            )
            
            # Acknowledge to sender
            await self.send_personal_message({
                "type": "message_sent",
                "message_id": broadcast_message["message_id"],
                "delivered_to": sent_count
            }, connection_id)
            
        except Exception as e:
            logger.error(f"Chat message handling error: {e}")
            await self.send_personal_message({
                "type": "error",
                "error": "Failed to send message"
            }, connection_id)

    async def send_admin_announcement(self, announcement: dict, target_users: List[str] = None):
        """Send admin announcement to targeted users"""
        message = {
            "type": "admin_announcement",
            "announcement": announcement,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        sent_count = 0
        
        if target_users:
            # Send to specific users
            for user_id in target_users:
                if await self.send_user_message(message, user_id):
                    sent_count += 1
        else:
            # Broadcast to all users
            sent_count = await self.broadcast_to_all(message)
            
        return sent_count

    async def send_live_update(self, update_type: str, update_data: dict, room_id: str = None):
        """Send live updates (calendar events, new tasks, etc.)"""
        message = {
            "type": "live_update",
            "update_type": update_type,
            "data": update_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if room_id:
            return await self.broadcast_to_room(message, room_id)
        else:
            return await self.broadcast_to_all(message)

    def get_active_users_count(self) -> int:
        """Get count of active connected users"""
        return len(self.user_connections)

    def get_room_count(self, room_id: str) -> int:
        """Get count of connections in specific room"""
        return len(self.room_connections.get(room_id, set()))

    def get_user_status(self, user_id: str) -> dict:
        """Get user connection status"""
        if user_id in self.user_connections:
            connection_id = self.user_connections[user_id]
            voice_active = connection_id in self.voice_sessions
            
            return {
                "online": True,
                "connection_id": connection_id,
                "voice_active": voice_active,
                "connected_at": datetime.utcnow().isoformat()  # This could be stored for more accuracy
            }
        else:
            return {
                "online": False,
                "connection_id": None,
                "voice_active": False,
                "last_seen": None
            }

# Global connection manager instance
connection_manager = ConnectionManager()