"""
Admin Assistant Router
Natural language admin commands and automated management
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import logging
from datetime import datetime, timedelta, timezone

from services.ai_service import ai_service
from services.websocket_service import connection_manager
from server import User, require_role, UserRole, db
from server import Event, Announcement, AdminAction

logger = logging.getLogger(__name__)

admin_assistant_router = APIRouter(prefix="/api/admin-assistant", tags=["admin-assistant"])

# Request Models
class AdminChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    auto_execute: bool = False  # Whether to automatically execute detected actions

class ActionConfirmationRequest(BaseModel):
    action_id: str
    confirmed: bool
    parameters: Optional[Dict[str, Any]] = None

class BulkOperationRequest(BaseModel):
    operation_type: str
    target_criteria: Dict[str, Any]
    action_parameters: Dict[str, Any]
    dry_run: bool = True

@admin_assistant_router.post("/chat")
async def admin_assistant_chat(
    request: AdminChatRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.OWNER]))
):
    """Chat with admin assistant for natural language admin commands"""
    
    try:
        # Get available admin actions based on user role
        available_actions = [
            "create_event", "update_categories", "bulk_user_management", 
            "system_announcement", "user_analytics", "performance_reports",
            "reward_management", "task_creation", "quota_management",
            "recruitment_analysis", "engagement_optimization"
        ]
        
        # Add context about current platform state
        admin_context = await _get_admin_context()
        
        # Get AI response with action detection
        result = await ai_service.get_admin_assistant_response(
            request.message,
            available_actions
        )
        
        response_data = {
            "success": result.get("success", False),
            "response": result.get("response", "Admin assistant unavailable"),
            "detected_action": result.get("detected_action"),
            "requires_confirmation": result.get("requires_confirmation", False),
            "context": admin_context,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # If action detected and auto-execute enabled
        if (result.get("detected_action") and 
            request.auto_execute and 
            not result.get("requires_confirmation")):
            
            execution_result = await _execute_detected_action(
                result["detected_action"],
                request.message,
                current_user.id
            )
            response_data["execution_result"] = execution_result
            
        return response_data
        
    except Exception as e:
        logger.error(f"Admin assistant chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@admin_assistant_router.post("/execute-action")
async def execute_admin_action_endpoint(
    request: ActionConfirmationRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.OWNER]))
):
    """Execute confirmed admin action"""
    
    if not request.confirmed:
        return {
            "success": False,
            "message": "Action execution cancelled by user"
        }
    
    try:
        # This would retrieve the pending action by ID
        # For now, we'll implement common actions
        
        action_id = request.action_id
        parameters = request.parameters or {}
        
        # Execute based on action type (stored in action_id for demo)
        if "create_event" in action_id:
            result = await _create_event_from_ai(parameters, current_user.id)
        elif "announcement" in action_id:
            result = await _create_announcement_from_ai(parameters, current_user.id)
        elif "bulk_users" in action_id:
            result = await _bulk_user_operation_from_ai(parameters, current_user.id)
        else:
            result = {"success": False, "message": "Unknown action type"}
        
        # Log admin action
        admin_action = AdminAction(
            admin_id=current_user.id,
            action_type=action_id.split("_")[0],
            action_data=parameters
        )
        await db.admin_actions.insert_one(admin_action.dict())
        
        return result
        
    except Exception as e:
        logger.error(f"Admin action execution error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@admin_assistant_router.post("/bulk-operation")
async def perform_bulk_operation(
    request: BulkOperationRequest,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.OWNER]))
):
    """Perform bulk operations with natural language criteria"""
    
    try:
        operation_type = request.operation_type
        criteria = request.target_criteria
        parameters = request.action_parameters
        
        # Build MongoDB query from natural language criteria
        query = await _build_query_from_criteria(criteria)
        
        if request.dry_run:
            # Count affected documents
            if operation_type == "user_management":
                count = await db.users.count_documents(query)
                affected_users = await db.users.find(query).limit(10).to_list(10)
                
                return {
                    "success": True,
                    "dry_run": True,
                    "operation": operation_type,
                    "affected_count": count,
                    "preview": [{"id": u["id"], "name": u["name"], "role": u["role"]} for u in affected_users],
                    "query_used": str(query)
                }
            else:
                return {
                    "success": False,
                    "error": "Unsupported operation type for dry run"
                }
        else:
            # Execute actual bulk operation
            if operation_type == "user_management":
                action = parameters.get("action", "update")
                update_data = parameters.get("update", {})
                
                if action == "update":
                    result = await db.users.update_many(query, {"$set": update_data})
                    return {
                        "success": True,
                        "operation": "user_update",
                        "modified_count": result.modified_count,
                        "matched_count": result.matched_count
                    }
                elif action == "delete":
                    result = await db.users.delete_many(query)
                    return {
                        "success": True,
                        "operation": "user_delete",
                        "deleted_count": result.deleted_count
                    }
            
            return {"success": False, "error": "Operation not implemented"}
            
    except Exception as e:
        logger.error(f"Bulk operation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@admin_assistant_router.get("/analytics")
async def get_admin_analytics(
    timeframe: str = "week",  # day, week, month, year
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.OWNER]))
):
    """Get comprehensive admin analytics with AI insights"""
    
    try:
        # Calculate date range
        end_date = datetime.now(timezone.utc)
        if timeframe == "day":
            start_date = end_date - timedelta(days=1)
        elif timeframe == "week":
            start_date = end_date - timedelta(weeks=1)
        elif timeframe == "month":
            start_date = end_date - timedelta(days=30)
        else:  # year
            start_date = end_date - timedelta(days=365)
        
        # Gather analytics data
        analytics_data = await _gather_analytics_data(start_date, end_date)
        
        # Generate AI insights
        insights_prompt = f"""
        Analyze this BIGO Live agency platform data and provide actionable insights:
        
        **Platform Metrics ({timeframe}):**
        - Total Users: {analytics_data['total_users']}
        - Active Hosts: {analytics_data['active_hosts']}
        - New Registrations: {analytics_data['new_users']}
        - Task Completions: {analytics_data['task_completions']}
        - Points Distributed: {analytics_data['points_distributed']}
        - Events Created: {analytics_data['events_created']}
        - Messages Sent: {analytics_data['messages_sent']}
        
        Provide:
        1. Key performance trends
        2. Areas needing attention
        3. Growth opportunities
        4. Specific action recommendations
        """
        
        ai_insights = await ai_service.get_admin_assistant_response(
            insights_prompt,
            ["analytics", "insights", "recommendations"]
        )
        
        return {
            "success": True,
            "timeframe": timeframe,
            "period": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            },
            "metrics": analytics_data,
            "ai_insights": ai_insights.get("response", "Insights unavailable"),
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Admin analytics error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@admin_assistant_router.post("/smart-announcement")
async def create_smart_announcement(
    request: Dict[str, Any],
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.OWNER]))
):
    """Create AI-generated announcements with smart targeting"""
    
    try:
        announcement_type = request.get("type", "general")
        target_audience = request.get("audience", "all")
        key_message = request.get("message", "")
        
        # Generate announcement content with AI
        content = await ai_service.generate_announcement_content(
            announcement_type,
            target_audience, 
            key_message
        )
        
        # Determine targeting criteria
        targeting_query = {}
        if target_audience == "hosts":
            targeting_query = {"role": "host"}
        elif target_audience == "coaches":
            targeting_query = {"role": "coach"}
        elif target_audience.startswith("tier_"):
            tier = target_audience.replace("tier_", "").upper()
            targeting_query = {"tier": tier}
        
        # Create announcement
        announcement = Announcement(
            title=f"{announcement_type.title()} Announcement",
            body=content,
            audience=target_audience,
            created_by=current_user.id,
            pinned=request.get("pinned", False)
        )
        
        await db.announcements.insert_one(announcement.dict())
        
        # Send to targeted users if not "all"
        if target_audience != "all" and targeting_query:
            target_users = await db.users.find(targeting_query).to_list(1000)
            user_ids = [u["id"] for u in target_users]
            
            # Send via WebSocket
            sent_count = await connection_manager.send_admin_announcement(
                announcement.dict(),
                user_ids
            )
            
            return {
                "success": True,
                "announcement": announcement,
                "targeting": {
                    "audience": target_audience,
                    "users_targeted": len(user_ids),
                    "users_reached": sent_count
                },
                "content_generated": True
            }
        else:
            # Broadcast to all
            sent_count = await connection_manager.send_admin_announcement(
                announcement.dict()
            )
            
            return {
                "success": True,
                "announcement": announcement,
                "targeting": {
                    "audience": "all",
                    "users_reached": sent_count
                },
                "content_generated": True
            }
            
    except Exception as e:
        logger.error(f"Smart announcement error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@admin_assistant_router.get("/action-suggestions")
async def get_action_suggestions(
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.OWNER]))
):
    """Get AI-powered action suggestions based on platform state"""
    
    try:
        # Get current platform metrics
        context = await _get_admin_context()
        
        suggestions_prompt = f"""
        Based on this BIGO Live agency platform data, suggest 5 specific admin actions to improve engagement and growth:
        
        **Current State:**
        - Total Users: {context['total_users']}
        - Active Hosts: {context['active_hosts']}
        - Pending Tasks: {context['pending_submissions']}
        - Upcoming Events: {context['upcoming_events']}
        - Recent Activity: {context['recent_activity']}
        
        Provide actionable suggestions in this format:
        1. **Action:** Brief description
           **Rationale:** Why this action is needed
           **Expected Impact:** Quantified expected outcome
        """
        
        result = await ai_service.get_admin_assistant_response(
            suggestions_prompt,
            ["suggestions", "recommendations", "optimization"]
        )
        
        return {
            "success": True,
            "suggestions": result.get("response", "No suggestions available"),
            "context_used": context,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Action suggestions error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Helper Functions
async def _get_admin_context() -> Dict[str, Any]:
    """Gather current admin context data"""
    try:
        total_users = await db.users.count_documents({})
        active_hosts = await db.users.count_documents({"role": "host", "status": "active"})
        pending_submissions = await db.task_submissions.count_documents({"status": "pending"})
        upcoming_events = await db.events.count_documents({
            "start_time": {"$gte": datetime.utcnow()},
            "active": True
        })
        
        return {
            "total_users": total_users,
            "active_hosts": active_hosts,
            "pending_submissions": pending_submissions,
            "upcoming_events": upcoming_events,
            "recent_activity": "normal",  # This could be calculated
            "platform_health": "good" if active_hosts > 10 else "needs_attention"
        }
    except Exception as e:
        logger.error(f"Error getting admin context: {e}")
        return {
            "total_users": 0,
            "active_hosts": 0,
            "pending_submissions": 0,
            "upcoming_events": 0,
            "recent_activity": "unknown",
            "platform_health": "unknown"
        }

async def _execute_detected_action(action_type: str, message: str, admin_id: str) -> Dict[str, Any]:
    """Execute auto-detected admin actions"""
    try:
        if action_type == "system_announcement":
            # Extract announcement content from message
            announcement = Announcement(
                title="Auto-Generated Announcement",
                body=message,
                created_by=admin_id,
                audience="all"
            )
            await db.announcements.insert_one(announcement.dict())
            return {"success": True, "message": "Announcement created"}
            
        elif action_type == "user_analytics":
            context = await _get_admin_context()
            return {"success": True, "data": context}
            
        else:
            return {"success": False, "message": f"Auto-execution not supported for {action_type}"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

async def _create_event_from_ai(parameters: Dict[str, Any], creator_id: str) -> Dict[str, Any]:
    """Create event from AI-extracted parameters"""
    try:
        # This would parse AI-extracted event details
        event = Event(
            title=parameters.get("title", "AI Generated Event"),
            description=parameters.get("description", "Event created by admin assistant"),
            event_type=parameters.get("type", "community"),
            start_time=datetime.utcnow() + timedelta(days=1),  # Default to tomorrow
            creator_id=creator_id,
            creator_bigo_id="ADMIN"
        )
        
        await db.events.insert_one(event.dict())
        return {"success": True, "event": event, "message": "Event created successfully"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

async def _create_announcement_from_ai(parameters: Dict[str, Any], creator_id: str) -> Dict[str, Any]:
    """Create announcement from AI-extracted parameters"""
    try:
        announcement = Announcement(
            title=parameters.get("title", "Admin Announcement"),
            body=parameters.get("content", "Announcement content"),
            audience=parameters.get("audience", "all"),
            created_by=creator_id,
            pinned=parameters.get("pinned", False)
        )
        
        await db.announcements.insert_one(announcement.dict())
        return {"success": True, "announcement": announcement, "message": "Announcement created"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

async def _bulk_user_operation_from_ai(parameters: Dict[str, Any], admin_id: str) -> Dict[str, Any]:
    """Perform bulk user operations from AI-extracted parameters"""
    try:
        operation = parameters.get("operation", "update")
        criteria = parameters.get("criteria", {})
        updates = parameters.get("updates", {})
        
        if operation == "update":
            result = await db.users.update_many(criteria, {"$set": updates})
            return {
                "success": True,
                "modified_count": result.modified_count,
                "matched_count": result.matched_count
            }
        else:
            return {"success": False, "error": "Unsupported bulk operation"}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

async def _build_query_from_criteria(criteria: Dict[str, Any]) -> Dict[str, Any]:
    """Build MongoDB query from natural language criteria"""
    query = {}
    
    # Simple mapping - could be enhanced with more sophisticated NLP
    if "role" in criteria:
        query["role"] = criteria["role"]
    if "status" in criteria:
        query["status"] = criteria["status"]
    if "tier" in criteria:
        query["tier"] = criteria["tier"]
    if "points_min" in criteria:
        query["total_points"] = {"$gte": criteria["points_min"]}
    if "joined_after" in criteria:
        query["joined_at"] = {"$gte": criteria["joined_after"]}
        
    return query

async def _gather_analytics_data(start_date: datetime, end_date: datetime) -> Dict[str, Any]:
    """Gather comprehensive analytics data for specified period"""
    try:
        # User metrics
        total_users = await db.users.count_documents({})
        active_hosts = await db.users.count_documents({"role": "host", "status": "active"})
        new_users = await db.users.count_documents({
            "joined_at": {"$gte": start_date, "$lte": end_date}
        })
        
        # Activity metrics
        task_completions = await db.task_submissions.count_documents({
            "submitted_at": {"$gte": start_date, "$lte": end_date}
        })
        
        events_created = await db.events.count_documents({
            "created_at": {"$gte": start_date, "$lte": end_date}
        })
        
        # Points metrics
        points_pipeline = [
            {"$match": {
                "created_at": {"$gte": start_date, "$lte": end_date},
                "delta": {"$gt": 0}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$delta"}}}
        ]
        points_result = await db.point_ledger.aggregate(points_pipeline).to_list(1)
        points_distributed = points_result[0]["total"] if points_result else 0
        
        # Message metrics (if collection exists)
        try:
            messages_sent = await db.messages.count_documents({
                "created_at": {"$gte": start_date, "$lte": end_date}
            })
        except Exception:
            messages_sent = 0
        
        return {
            "total_users": total_users,
            "active_hosts": active_hosts,
            "new_users": new_users,
            "task_completions": task_completions,
            "points_distributed": points_distributed,
            "events_created": events_created,
            "messages_sent": messages_sent
        }
        
    except Exception as e:
        logger.error(f"Error gathering analytics: {e}")
        return {
            "total_users": 0,
            "active_hosts": 0,
            "new_users": 0,
            "task_completions": 0,
            "points_distributed": 0,
            "events_created": 0,
            "messages_sent": 0
        }