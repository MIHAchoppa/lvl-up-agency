# Coordinator Behavior and Implementation Runbook

## Overview
This runbook provides step-by-step instructions for implementing and running the compound-model orchestration system for AI Admin and AI Coach roles.

## Quick Start

### Minimal Setup
1. Choose your models (see Model Selection below)
2. Implement the coordinator logic (see Implementation Patterns below)
3. Configure GitHub API access (see GitHub Integration below)
4. Test with example requests (see Testing section below)

### Time to First Response
- **Simple setup**: 30-60 minutes
- **Production setup**: 2-4 hours
- **With semantic-code-search**: Add 1-2 hours

---

## Coordinator Behavior

### Execution Flow

```
┌─────────────────┐
│  User Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 1: Parallel Retrieval             │
│  - RetrieverModel finds candidates      │
│  - Returns blob URLs + line ranges      │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 2: Parallel Extraction            │
│  - ExtractorModel fetches each blob     │
│  - Returns verbatim content + metadata  │
│  - Runs in parallel per candidate       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 3: Parallel Verification          │
│  - VerifierModel confirms each extract  │
│  - Independent fetch + comparison       │
│  - Returns match status                 │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 4: Composition                    │
│  - ComposerModel builds Output Schema   │
│  - Uses only verified (match:true) data │
│  - Sets NOT_AVAILABLE for missing       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 5: Auditing                       │
│  - AuditorModel validates response      │
│  - Checks all guardrails                │
│  - Returns error or passes through      │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Final Response │
└─────────────────┘
```

### For AI Coach (Additional Step)

Insert between Step 3 and Step 4:

```
┌─────────────────────────────────────────┐
│  Step 3.5: Synthesis (if requested)     │
│  - SynthesisModel generates coaching    │
│  - Uses verified data only              │
│  - Labels all suggestions               │
└─────────────────────────────────────────┘
```

---

## Implementation Patterns

### Option 1: Simple Sequential (Good for Prototyping)

```python
async def orchestrate_admin_request(query: str, repo: str, ref: str = None):
    """Simple sequential implementation for AI Admin."""
    
    # Step 1: Retrieval
    retriever_prompt = build_retriever_prompt(query, repo, ref)
    candidates = await call_model("retriever", retriever_prompt)
    
    if not candidates:
        return not_available_response("No matches found")
    
    # Step 2: Extraction
    extracts = []
    for candidate in candidates:
        extractor_prompt = build_extractor_prompt(candidate)
        extract = await call_model("extractor", extractor_prompt)
        extracts.append(extract)
    
    # Step 3: Verification
    verified = []
    for extract in extracts:
        verifier_prompt = build_verifier_prompt(extract)
        verification = await call_model("verifier", verifier_prompt)
        if verification["match"]:
            verified.append(extract)
    
    # Step 4: Composition
    composer_prompt = build_composer_prompt(verified, query)
    response = await call_model("composer", composer_prompt)
    
    # Step 5: Auditing
    auditor_prompt = build_auditor_prompt(response, "admin")
    final_response = await call_model("auditor", auditor_prompt)
    
    return final_response
```

### Option 2: Parallel Execution (Production Ready)

```python
import asyncio

async def orchestrate_admin_request(query: str, repo: str, ref: str = None):
    """Production-ready parallel implementation for AI Admin."""
    
    # Step 1: Retrieval (sequential - depends on user input)
    retriever_prompt = build_retriever_prompt(query, repo, ref)
    candidates = await call_model("retriever", retriever_prompt)
    
    if not candidates:
        return not_available_response("No matches found")
    
    # Step 2 + 3: Extraction and Verification in parallel
    async def extract_and_verify(candidate):
        # Extract
        extractor_prompt = build_extractor_prompt(candidate)
        extract = await call_model("extractor", extractor_prompt)
        
        # Verify
        verifier_prompt = build_verifier_prompt(extract)
        verification = await call_model("verifier", verifier_prompt)
        
        if verification["match"]:
            return extract
        return None
    
    # Run all candidates in parallel
    verified_results = await asyncio.gather(
        *[extract_and_verify(c) for c in candidates]
    )
    
    verified = [v for v in verified_results if v is not None]
    
    if not verified:
        return not_available_response("Verification failed for all candidates")
    
    # Step 4: Composition
    composer_prompt = build_composer_prompt(verified, query)
    response = await call_model("composer", composer_prompt)
    
    # Step 5: Auditing
    auditor_prompt = build_auditor_prompt(response, "admin")
    final_response = await call_model("auditor", auditor_prompt)
    
    return final_response
```

### Option 3: With Caching (Optimized)

```python
from datetime import datetime, timedelta

# Simple in-memory cache with TTL
cache = {}
CACHE_TTL = 60  # seconds

async def orchestrate_admin_request(query: str, repo: str, ref: str = None):
    """Optimized implementation with caching."""
    
    # Step 1: Retrieval with cache
    cache_key = f"{repo}:{ref or 'default'}:{query}"
    cached = get_from_cache(cache_key)
    
    if cached and not is_expired(cached):
        candidates = cached["candidates"]
    else:
        retriever_prompt = build_retriever_prompt(query, repo, ref)
        candidates = await call_model("retriever", retriever_prompt)
        set_cache(cache_key, {"candidates": candidates}, ttl=CACHE_TTL)
    
    if not candidates:
        return not_available_response("No matches found")
    
    # Steps 2-5: Same as parallel implementation
    # ... (rest of the code)

def get_from_cache(key: str):
    """Get item from cache if not expired."""
    if key in cache:
        entry = cache[key]
        if datetime.now() < entry["expires_at"]:
            return entry["data"]
        else:
            del cache[key]
    return None

def is_expired(entry):
    """Check if cache entry is expired."""
    return datetime.now() >= entry["expires_at"]

def set_cache(key: str, data: dict, ttl: int):
    """Set cache entry with TTL."""
    cache[key] = {
        "data": data,
        "expires_at": datetime.now() + timedelta(seconds=ttl)
    }
```

### Option 4: AI Coach with Synthesis

```python
async def orchestrate_coach_request(
    query: str, 
    repo: str, 
    ref: str = None,
    include_coaching: bool = False
):
    """Implementation for AI Coach with optional coaching."""
    
    # Steps 1-3: Same as AI Admin (retrieval, extraction, verification)
    verified = await retrieve_and_verify(query, repo, ref)
    
    if not verified:
        return not_available_response("No relevant code found")
    
    # Step 3.5: Synthesis (if coaching requested)
    synthesis = None
    if include_coaching:
        synthesis_prompt = build_synthesis_prompt(verified, query)
        synthesis = await call_model("synthesis", synthesis_prompt)
    
    # Step 4: Composition (include synthesis if present)
    composer_prompt = build_coach_composer_prompt(verified, synthesis, query)
    response = await call_model("composer", composer_prompt)
    
    # Step 5: Auditing (with coach-specific checks)
    auditor_prompt = build_auditor_prompt(response, "coach")
    final_response = await call_model("auditor", auditor_prompt)
    
    return final_response
```

---

## Model Selection

### Recommended Models by Component

| Component | Purpose | Recommended Models | Notes |
|-----------|---------|-------------------|-------|
| **RetrieverModel** | Code search | GPT-4-Turbo, Claude-3-Opus, semantic-code-search API | Needs to understand code semantics |
| **ExtractorModel** | Fetch files | GitHub API, git commands, custom fetcher | Simple HTTP/Git client works |
| **VerifierModel** | Confirm data | GitHub API (independent fetch), GPT-4 | Must be independent from ExtractorModel |
| **ComposerModel** | Build JSON | GPT-4, Claude-3, GPT-3.5-Turbo | Needs good JSON formatting |
| **AuditorModel** | Validate | GPT-4, custom validator script | Can be rule-based or LLM |
| **CoachExtractorModel** | Coaching extract | GPT-4-Turbo, Claude-3-Opus | Needs context understanding |
| **SynthesisModel** | Generate coaching | GPT-4, Claude-3-Opus | Needs strong reasoning |

### Cost Optimization

**Low-Cost Stack**:
- RetrieverModel: GPT-3.5-Turbo + semantic-code-search
- ExtractorModel: GitHub API (free)
- VerifierModel: GitHub API (free)
- ComposerModel: GPT-3.5-Turbo
- AuditorModel: Custom script (free)
- Total cost per request: ~$0.01-0.05

**High-Quality Stack**:
- RetrieverModel: GPT-4-Turbo
- ExtractorModel: GitHub API
- VerifierModel: GitHub API + GPT-4
- ComposerModel: GPT-4
- AuditorModel: GPT-4
- Total cost per request: ~$0.10-0.30

**Hybrid Stack** (Recommended):
- RetrieverModel: semantic-code-search (fast) + GPT-4-Turbo fallback
- ExtractorModel: GitHub API
- VerifierModel: GitHub API (no LLM needed)
- ComposerModel: GPT-4
- AuditorModel: Custom script for basic checks + GPT-3.5-Turbo for edge cases
- Total cost per request: ~$0.02-0.10

---

## GitHub Integration

### Setup GitHub API Access

```python
import os
from github import Github

# Initialize GitHub client
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
gh = Github(GITHUB_TOKEN)

async def fetch_blob_content(repo: str, path: str, ref: str = None):
    """Fetch file content from GitHub."""
    try:
        repo_obj = gh.get_repo(repo)
        
        # Get default branch if ref not specified
        if not ref:
            ref = repo_obj.default_branch
        
        # Fetch file content
        content = repo_obj.get_contents(path, ref=ref)
        
        return {
            "content": content.decoded_content.decode('utf-8'),
            "sha": content.sha,
            "size": content.size,
            "url": content.html_url,
            "ref": ref
        }
    
    except Exception as e:
        return {
            "error": str(e),
            "content": None
        }

async def fetch_blob_lines(repo: str, path: str, start_line: int, end_line: int, ref: str = None):
    """Fetch specific lines from a file."""
    blob_data = await fetch_blob_content(repo, path, ref)
    
    if blob_data["content"] is None:
        return blob_data
    
    lines = blob_data["content"].split('\n')
    
    # Extract line range (1-indexed)
    selected_lines = lines[start_line-1:end_line]
    
    return {
        **blob_data,
        "lines": '\n'.join(selected_lines),
        "start_line": start_line,
        "end_line": end_line
    }
```

### Rate Limiting

```python
from time import sleep

def check_rate_limit():
    """Check GitHub API rate limit."""
    rate_limit = gh.get_rate_limit()
    core = rate_limit.core
    
    if core.remaining < 100:
        reset_time = core.reset
        wait_seconds = (reset_time - datetime.now()).total_seconds()
        
        return {
            "limited": True,
            "remaining": core.remaining,
            "reset_at": reset_time,
            "wait_seconds": wait_seconds
        }
    
    return {
        "limited": False,
        "remaining": core.remaining
    }

async def call_with_rate_limit(func, *args, **kwargs):
    """Call function with rate limit handling."""
    limit_status = check_rate_limit()
    
    if limit_status["limited"]:
        raise Exception(
            f"GitHub API rate limit exceeded. "
            f"Resets in {limit_status['wait_seconds']} seconds. "
            f"Remaining: {limit_status['remaining']}"
        )
    
    return await func(*args, **kwargs)
```

### Authentication Handling

```python
def fetch_with_auth(repo: str, path: str, ref: str = None):
    """Fetch with proper authentication error handling."""
    try:
        return fetch_blob_content(repo, path, ref)
    except GithubException as e:
        if e.status == 401:
            return {
                "status": "not_available",
                "message": "NOT_AVAILABLE: access denied or requires authentication"
            }
        elif e.status == 404:
            return {
                "status": "not_available",
                "message": f"NOT_AVAILABLE: file not found at path '{path}'"
            }
        else:
            return {
                "status": "error",
                "message": f"ERROR: {str(e)}"
            }
```

---

## Semantic Code Search Integration

### Setup

If using the semantic-code-search tool:

```python
async def semantic_code_search(query: str, repo_owner: str, repo_name: str):
    """Call semantic-code-search API."""
    
    payload = {
        "query": query,  # Full sentence query
        "repoOwner": repo_owner,
        "repoName": repo_name
    }
    
    # Call your semantic-code-search endpoint
    response = await http_client.post(
        "https://your-semantic-search-api/search",
        json=payload
    )
    
    return response.json()
```

### Integration with RetrieverModel

```python
async def retriever_with_semantic_search(query: str, repo: str, ref: str = None):
    """RetrieverModel that uses semantic-code-search."""
    
    owner, repo_name = repo.split('/')
    
    # Call semantic-code-search
    search_results = await semantic_code_search(query, owner, repo_name)
    
    # Transform results to standard format
    candidates = []
    for result in search_results.get("matches", []):
        candidates.append({
            "path": result["file_path"],
            "ref": ref or "main",
            "blob_url": result["source_url"],
            "start_line": result["line_range"].split('-')[0],
            "end_line": result["line_range"].split('-')[1],
            "blob_sha": result.get("blob_sha"),
            "confidence": result.get("score", 0.9)
        })
    
    return candidates
```

### Verification of Semantic Search Results

```python
async def verify_semantic_result(result: dict):
    """Verify semantic-code-search result with independent fetch."""
    
    # Independent fetch via GitHub API
    blob_data = await fetch_blob_lines(
        repo=f"{result['repo_owner']}/{result['repo_name']}",
        path=result['path'],
        start_line=int(result['start_line']),
        end_line=int(result['end_line']),
        ref=result['ref']
    )
    
    # Compare with semantic search result
    if blob_data.get("error"):
        return {
            "match": False,
            "reason": blob_data["error"]
        }
    
    expected = result.get("raw_lines", "")
    actual = blob_data.get("lines", "")
    
    return {
        "match": expected.strip() == actual.strip(),
        "confirmed_raw_lines": actual,
        "blob_sha": blob_data["sha"]
    }
```

---

## Error Handling

### Common Errors and Responses

```python
def handle_retriever_error(e: Exception):
    """Handle retriever errors."""
    return {
        "status": "error",
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "data": {},
        "sources": [],
        "message": f"ERROR: Retriever failed - {str(e)}"
    }

def handle_verification_failure(verified_count: int, total_count: int):
    """Handle when all verifications fail."""
    return {
        "status": "not_available",
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "data": {},
        "sources": [],
        "message": f"NOT_AVAILABLE: Data verification failed ({verified_count}/{total_count} candidates verified)"
    }

def handle_rate_limit_error(reset_time: datetime):
    """Handle GitHub rate limit."""
    return {
        "status": "error",
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "data": {},
        "sources": [],
        "message": f"ERROR: GitHub API rate limit exceeded. Resets at {reset_time.isoformat()}"
    }

def handle_no_matches():
    """Handle when no matches found."""
    return {
        "status": "not_available",
        "fetched_at": datetime.utcnow().isoformat() + "Z",
        "data": {},
        "sources": [],
        "message": "NOT_AVAILABLE: No matches found for query"
    }
```

---

## Testing

### Test Request Examples

```python
# Test 1: Simple file retrieval
test_admin_request_1 = {
    "role": "admin",
    "action": "get_file",
    "repo": "MIHAchoppa/lvl-up-agency",
    "path": "README.md",
    "ref": "main"
}

# Test 2: Specific lines
test_admin_request_2 = {
    "role": "admin",
    "action": "get_lines",
    "repo": "MIHAchoppa/lvl-up-agency",
    "path": "backend/server.py",
    "line_range": "45-60",
    "ref": "main"
}

# Test 3: File not found
test_admin_request_3 = {
    "role": "admin",
    "action": "get_file",
    "repo": "MIHAchoppa/lvl-up-agency",
    "path": "nonexistent/file.js"
}

# Test 4: Coach query without coaching
test_coach_request_1 = {
    "role": "coach",
    "action": "find",
    "query": "Where is authentication implemented?",
    "repo": "MIHAchoppa/lvl-up-agency",
    "include_coaching": False
}

# Test 5: Coach query with coaching
test_coach_request_2 = {
    "role": "coach",
    "action": "explain",
    "query": "How can I add OAuth authentication?",
    "repo": "MIHAchoppa/lvl-up-agency",
    "include_coaching": True
}
```

### Validation Tests

```python
import json

def validate_output_schema(response: dict):
    """Validate response matches Global Output Schema."""
    
    required_fields = ["status", "fetched_at", "data", "sources", "message"]
    
    # Check required fields
    for field in required_fields:
        assert field in response, f"Missing required field: {field}"
    
    # Validate status
    assert response["status"] in ["success", "not_available", "error"]
    
    # Validate timestamp format
    assert re.match(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$', response["fetched_at"])
    
    # Validate sources structure
    for source in response["sources"]:
        assert "type" in source
        assert "url" in source
        assert "ref" in source
        assert "path" in source
    
    # If success, should have data
    if response["status"] == "success":
        assert response["data"], "Success response should have data"
        assert response["sources"], "Success response should have sources"
    
    # If not_available or error, should have empty data/sources
    if response["status"] in ["not_available", "error"]:
        assert not response["data"], "Error/not_available should have empty data"
        assert not response["sources"], "Error/not_available should have empty sources"
    
    print("✅ Output schema validation passed")

def test_orchestration():
    """Run orchestration tests."""
    
    print("Running orchestration tests...")
    
    # Test 1: Admin file retrieval
    response1 = await orchestrate_admin_request(
        query="Get file README.md",
        repo="MIHAchoppa/lvl-up-agency",
        ref="main"
    )
    validate_output_schema(response1)
    assert response1["status"] == "success"
    print("✅ Test 1 passed: Admin file retrieval")
    
    # Test 2: File not found
    response2 = await orchestrate_admin_request(
        query="Get file nonexistent.js",
        repo="MIHAchoppa/lvl-up-agency"
    )
    validate_output_schema(response2)
    assert response2["status"] == "not_available"
    print("✅ Test 2 passed: File not found handling")
    
    # Test 3: Coach with raw data
    response3 = await orchestrate_coach_request(
        query="Where is authentication implemented?",
        repo="MIHAchoppa/lvl-up-agency",
        include_coaching=False
    )
    validate_output_schema(response3)
    assert response3["status"] == "success"
    assert "matches" in response3["data"]
    print("✅ Test 3 passed: Coach raw data")
    
    # Test 4: Coach with coaching
    response4 = await orchestrate_coach_request(
        query="How to add OAuth?",
        repo="MIHAchoppa/lvl-up-agency",
        include_coaching=True
    )
    validate_output_schema(response4)
    assert response4["status"] == "success"
    assert "matches" in response4["data"]
    assert "coaching" in response4["data"]
    print("✅ Test 4 passed: Coach with coaching")
    
    print("\n✅ All tests passed!")
```

---

## Performance Benchmarks

### Expected Response Times

| Operation | Sequential | Parallel | With Cache |
|-----------|-----------|----------|------------|
| Single file (Admin) | 2-4s | 1-2s | 0.1-0.5s |
| Multiple files (Admin) | 5-10s | 2-3s | 0.5-1s |
| Coach raw data | 3-5s | 1.5-2.5s | 0.5-1s |
| Coach with coaching | 6-10s | 3-5s | 1-2s |

### Optimization Tips

1. **Use parallel execution** for Steps 2-3 (extraction + verification)
2. **Cache retrieval results** for 60 seconds
3. **Batch GitHub API calls** where possible
4. **Use semantic-code-search** for faster retrieval
5. **Skip AuditorModel** for trusted internal requests (use only for user-facing)

---

## Security Checklist

- [ ] GitHub token stored securely (environment variable, not hardcoded)
- [ ] Rate limiting implemented
- [ ] Authentication errors handled properly
- [ ] Private repo access clearly denied with NOT_AVAILABLE
- [ ] No credentials exposed in responses
- [ ] Read-only GitHub access (no write permissions)
- [ ] Input validation on repo/path parameters
- [ ] Timeout limits on all external calls

---

## Production Deployment Checklist

- [ ] All components implemented
- [ ] Error handling in place
- [ ] Rate limiting configured
- [ ] Caching enabled
- [ ] Logging configured
- [ ] Metrics/monitoring set up
- [ ] All tests passing
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Example requests tested

---

## Next Steps

1. **Start Simple**: Implement sequential version first
2. **Test Thoroughly**: Use test requests to validate
3. **Optimize**: Add parallelization and caching
4. **Monitor**: Track performance and errors
5. **Iterate**: Improve based on usage patterns

---

## Support and Troubleshooting

### Common Issues

**Issue**: "Rate limit exceeded"
- **Solution**: Implement caching and batch requests

**Issue**: "Verification always fails"
- **Solution**: Check that VerifierModel uses independent fetch, not cached data

**Issue**: "Slow responses"
- **Solution**: Enable parallel execution for Steps 2-3

**Issue**: "Missing sources in response"
- **Solution**: Check ComposerModel prompt, ensure sources[] is populated

**Issue**: "AuditorModel rejects valid responses"
- **Solution**: Review validation rules, may be too strict

---

This runbook should help you implement the orchestration system step by step. Start with the simple sequential pattern, test it, then optimize with parallel execution and caching.
