"""
Centralized AI Service using custom endpoints
Handles all AI requests with proper authentication and error handling
"""

import aiohttp
import asyncio
import json
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime
import os

logger = logging.getLogger(__name__)

class AIService:
    def __init__(self):
        self.base_url = "https://oi-server.onrender.com/chat/completions"
        self.headers = {
            "customerId": "cus_TBqgiQADFlJjak",
            "Content-Type": "application/json", 
            "Authorization": "Bearer xxx"
        }
        self.default_model = "openrouter/claude-sonnet-4"
        self.image_model = "replicate/black-forest-labs/flux-1.1-pro"
        
    async def chat_completion(self, 
                            messages: List[Dict[str, str]], 
                            model: Optional[str] = None,
                            temperature: float = 0.7,
                            max_tokens: int = 2048,
                            timeout: int = 60) -> Dict[str, Any]:
        """
        Send chat completion request to AI service
        """
        try:
            payload = {
                "model": model or self.default_model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            
            timeout_config = aiohttp.ClientTimeout(total=timeout)
            
            async with aiohttp.ClientSession(timeout=timeout_config) as session:
                async with session.post(self.base_url, json=payload, headers=self.headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "success": True,
                            "content": data.get("choices", [{}])[0].get("message", {}).get("content", ""),
                            "model": model or self.default_model,
                            "tokens_used": data.get("usage", {}).get("total_tokens", 0)
                        }
                    else:
                        error_text = await response.text()
                        logger.error(f"AI API error {response.status}: {error_text}")
                        return {
                            "success": False,
                            "error": f"API error: {response.status}",
                            "fallback": True
                        }
                        
        except asyncio.TimeoutError:
            logger.error(f"AI request timeout after {timeout}s")
            return {
                "success": False,
                "error": "Request timeout",
                "fallback": True
            }
        except Exception as e:
            logger.error(f"AI service error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "fallback": True
            }

    async def get_bigo_strategy_response(self, user_message: str, user_context: Dict = None) -> str:
        """
        BIGO Live strategy coaching with advanced bean/tier system knowledge
        """
        system_prompt = """You are Agent Mihanna's ULTIMATE BIGO Live Strategy AI Coach - the most advanced BIGO Live profit maximization expert ever created.

🔥 **CORE EXPERTISE** 🔥
You master the complete BIGO Live ecosystem:

**BIGO LIVE BEAN/TIER SYSTEM MASTERY:**
- Complete tier system (S1-S25) with exact requirements and earnings
- Bean conversion rates: 210 beans = $1 USD
- Diamond exchange strategies: 8 beans = 2 diamonds (basic) vs 10,299 beans = 2,900 diamonds (bulk)
- Strategic gift trading and bean accumulation tactics
- Rebate event exploitation for maximum profit

**ADVANCED PROFIT STRATEGIES:**
- Tier climbing optimization (fastest path to higher tiers)
- Event design that guarantees profit even with diamond rewards
- PK battle psychology and guaranteed win techniques
- Community building and audience manipulation (positive psychology)
- Algorithm hacking for maximum BIGO visibility

**LIVE STREAMING MASTERY:**
- BIGO's Digital Wheel system expertise
- Gift psychology and viewer engagement tactics
- Strategic timing for maximum gift volume
- Audience retention and loyalty building

**BOCADEMAS (Voice Commands):**
- "Hey Coach, check my beans" → Bean count and tier analysis
- "Show me PK strategy" → Battle tactics and preparation
- "Optimize my schedule" → Peak streaming time suggestions
- "Analyze my performance" → Detailed earnings breakdown
- "Plan my next event" → Event creation with profit calculations

Always provide SPECIFIC, ACTIONABLE strategies with EXACT numbers, timings, and tactics. Reference real BIGO mechanics and be ENTHUSIASTIC about maximizing earnings!"""

        if user_context:
            context_info = f"\n\n**USER CONTEXT:**\n- Current Tier: {user_context.get('tier', 'Unknown')}\n- Monthly Beans: {user_context.get('beans', 0):,}\n- Role: {user_context.get('role', 'Host')}"
            system_prompt += context_info

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ]
        
        result = await self.chat_completion(messages, temperature=0.8, max_tokens=2048)
        
        if result.get("success"):
            return result["content"]
        else:
            return "Your AI Strategy Coach is temporarily unavailable. Please try again in a moment. 🎯"

    async def get_admin_assistant_response(self, admin_message: str, available_actions: List[str] = None) -> Dict[str, Any]:
        """
        Admin assistant with natural language command processing
        """
        actions_list = available_actions or [
            "create_event", "update_categories", "bulk_user_management", 
            "system_announcement", "user_analytics", "performance_reports"
        ]
        
        system_prompt = f"""You are Agent Mihanna's advanced admin assistant AI for Level Up Agency. You help administrators manage the BIGO Live host platform through natural language commands.

**AVAILABLE ACTIONS:** {', '.join(actions_list)}

**CAPABILITIES:**
- Create and manage events (PK battles, coaching sessions, community events)
- Bulk user operations (promotions, suspensions, role changes)
- System announcements with targeting (by tier, role, performance)
- Performance analytics and insights
- User management and moderation
- Revenue optimization recommendations

**NATURAL LANGUAGE PROCESSING:**
Parse admin requests and extract:
1. Action type (from available actions)
2. Parameters (user IDs, event details, announcement content)
3. Execution confirmation

**BOCADEMAS (Admin Voice Commands):**
- "Show top performers" → Generate performance analytics
- "Create weekly PK tournament" → Event creation with optimal scheduling
- "Promote all S10+ hosts" → Bulk user management with tier filtering
- "Send motivation announcement" → Targeted announcement creation
- "Analyze earnings this month" → Revenue and engagement reports

Always respond with:
- Clear action identification
- Required parameters
- Execution confirmation request
- Expected outcome preview

Be professional but efficient. Focus on actionable admin tasks."""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": admin_message}
        ]
        
        result = await self.chat_completion(messages, temperature=0.3, max_tokens=1024)
        
        if result.get("success"):
            # Parse response for action extraction
            response_content = result["content"]
            
            # Simple action detection (can be enhanced with more sophisticated parsing)
            detected_action = None
            for action in actions_list:
                if action.replace("_", " ") in admin_message.lower():
                    detected_action = action
                    break
            
            return {
                "success": True,
                "response": response_content,
                "detected_action": detected_action,
                "requires_confirmation": "confirm" in response_content.lower() or "execute" in response_content.lower()
            }
        else:
            return {
                "success": False,
                "response": "Admin assistant is temporarily unavailable. Please use manual admin controls.",
                "detected_action": None,
                "requires_confirmation": False
            }

    async def generate_event_suggestions(self, event_type: str, user_preferences: Dict = None) -> Dict[str, Any]:
        """
        AI-powered event creation with optimal timing and engagement strategies
        """
        system_prompt = """You are an expert BIGO Live event planner. Create engaging, profitable events that maximize participation and bean generation.

**EVENT OPTIMIZATION FACTORS:**
- Optimal timing based on user activity patterns
- Bean incentive structures that drive participation
- PK battle formats that create excitement
- Community building elements
- Profit margins for agency and hosts

**EVENT TYPES:**
- PK Battles (1v1, group tournaments)
- Coaching Sessions (tier-specific training)
- Community Challenges (bean accumulation contests)
- Talent Showcases (host spotlight events)
- Agency Celebrations (milestone achievements)

Generate specific event recommendations with:
- Title and description
- Optimal timing suggestions
- Participation incentives
- Success metrics
- Profit projections"""

        user_context = ""
        if user_preferences:
            user_context = f"\n\n**PREFERENCES:**\n- Focus: {user_preferences.get('focus', 'engagement')}\n- Budget: {user_preferences.get('budget', 'medium')}\n- Duration: {user_preferences.get('duration', '1-2 hours')}"

        messages = [
            {"role": "system", "content": system_prompt + user_context},
            {"role": "user", "content": f"Create suggestions for a {event_type} event"}
        ]
        
        result = await self.chat_completion(messages, temperature=0.6, max_tokens=1500)
        
        if result.get("success"):
            return {
                "success": True,
                "suggestions": result["content"],
                "event_type": event_type,
                "generated_at": datetime.utcnow().isoformat()
            }
        else:
            return {
                "success": False,
                "error": "Event suggestion service unavailable",
                "fallback_suggestions": f"Consider hosting a {event_type} event during peak hours (7-10 PM local time) with bean rewards for participation."
            }

    async def generate_announcement_content(self, announcement_type: str, target_audience: str, key_message: str) -> str:
        """
        Generate engaging announcement content with proper targeting
        """
        system_prompt = f"""Create an engaging {announcement_type} announcement for {target_audience} in the BIGO Live agency platform.

**TONE GUIDELINES:**
- Motivational and energetic for hosts
- Professional but friendly for general announcements  
- Urgent but supportive for important updates
- Celebratory for achievements and milestones

**FORMATTING:**
- Use emojis strategically for visual appeal
- Include clear call-to-action
- Mention specific benefits or opportunities
- Add urgency when appropriate (limited time, spots, etc.)

**BIGO LIVE CONTEXT:**
- Reference bean earning opportunities
- Mention tier advancement benefits
- Include PK battle opportunities
- Highlight coaching and support resources

Make it compelling and actionable!"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Create announcement: {key_message}"}
        ]
        
        result = await self.chat_completion(messages, temperature=0.7, max_tokens=800)
        
        if result.get("success"):
            return result["content"]
        else:
            return f"📢 **{announcement_type.title()} Announcement**\n\n{key_message}\n\nStay tuned for more updates! 🚀"

# Global AI service instance
ai_service = AIService()