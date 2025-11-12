"""
Test to verify blog LLM integration fix
"""
import pytest
from unittest.mock import AsyncMock, MagicMock
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from routers.blog_router import generate_blog_with_ai, BlogGenerateRequest

# Use anyio for async support (already installed)
pytestmark = pytest.mark.anyio


async def test_generate_blog_with_ai_success():
    """Test that generate_blog_with_ai correctly handles AI service response"""
    
    # Mock AI service with correct response format
    mock_ai_service = MagicMock()
    mock_ai_service.chat_completion = AsyncMock(return_value={
        "success": True,
        "content": """{
            "title": "Test Blog Title",
            "excerpt": "This is a test excerpt",
            "content": "# Test Blog Title\\n\\nThis is test content",
            "tags": ["test", "blog"],
            "seo_keywords": ["test", "blog", "seo"],
            "meta_description": "Test meta description for SEO"
        }""",
        "model": "test-model",
        "usage": {}
    })
    
    # Inject mock service
    import routers.blog_router as blog_router
    original_ai_service = blog_router.ai_service
    blog_router.ai_service = mock_ai_service
    
    try:
        # Create request
        request = BlogGenerateRequest(
            topic="Test Topic",
            category="testing",
            keywords=["test"],
            tone="professional",
            length="medium"
        )
        
        # Generate blog
        result = await generate_blog_with_ai(request, "Test User")
        
        # Verify result
        assert result is not None
        assert result['title'] == "Test Blog Title"
        assert result['excerpt'] == "This is a test excerpt"
        assert '# Test Blog Title' in result['content']
        assert 'test' in result['tags']
        assert result['seo_keywords'] == ["test", "blog", "seo"]
        
    finally:
        # Restore original service
        blog_router.ai_service = original_ai_service


async def test_generate_blog_with_ai_service_error():
    """Test that generate_blog_with_ai handles AI service errors gracefully"""
    
    # Mock AI service with error response
    mock_ai_service = MagicMock()
    mock_ai_service.chat_completion = AsyncMock(return_value={
        "success": False,
        "error": "API key invalid"
    })
    
    # Inject mock service
    import routers.blog_router as blog_router
    original_ai_service = blog_router.ai_service
    blog_router.ai_service = mock_ai_service
    
    try:
        # Create request
        request = BlogGenerateRequest(
            topic="Test Topic",
            category="testing"
        )
        
        # Generate blog (should fallback to template)
        result = await generate_blog_with_ai(request, "Test User")
        
        # Verify fallback template is used
        assert result is not None
        assert result['title'] == "Test Topic"
        assert 'Content generation in progress' in result['content']
        
    finally:
        # Restore original service
        blog_router.ai_service = original_ai_service


async def test_generate_blog_with_old_response_format_fails():
    """Test that old OpenAI-style response format would fail (validates the bug fix)"""
    
    # Mock AI service with OLD incorrect response format (what it should NOT be)
    mock_ai_service = MagicMock()
    mock_ai_service.chat_completion = AsyncMock(return_value={
        "choices": [{
            "message": {
                "content": '{"title": "Test"}'
            }
        }]
    })
    
    # Inject mock service
    import routers.blog_router as blog_router
    original_ai_service = blog_router.ai_service
    blog_router.ai_service = mock_ai_service
    
    try:
        request = BlogGenerateRequest(topic="Test")
        
        # This should use fallback since the response doesn't have 'success' field
        result = await generate_blog_with_ai(request, "Test User")
        
        # Should use fallback template
        assert result['title'] == "Test"
        assert 'Content generation in progress' in result['content']
        
    finally:
        blog_router.ai_service = original_ai_service


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v"])
