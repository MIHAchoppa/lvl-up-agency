# Example Coordinator Payloads

## Overview
This file contains ready-to-use coordinator payloads for common AI Admin and AI Coach scenarios. Use these as templates for implementing your orchestration system.

**Repository**: MIHAchoppa/lvl-up-agency

---

## AI Admin Examples

### Example 1: Get Complete File

**User Input:**
```json
{
  "role": "admin",
  "action": "get_file",
  "repo": "MIHAchoppa/lvl-up-agency",
  "path": "backend/server.py",
  "ref": "main"
}
```

**Coordinator Steps:**

#### Step 1: RetrieverModel Call
```json
{
  "model": "RetrieverModel",
  "prompt": "You are RetrieverModel. Given this full-sentence user query: 'Get raw file at path backend/server.py in MIHAchoppa/lvl-up-agency on ref main', in repo 'MIHAchoppa/lvl-up-agency', find candidate files/blob URLs and exact line ranges that directly contain the requested data.\n\nINPUT PARAMETERS:\n- query: Get raw file at path backend/server.py\n- repo: MIHAchoppa/lvl-up-agency\n- path: backend/server.py\n- ref: main\n\nReturn a JSON array of objects with path, ref, blob_url, start_line, end_line. Do NOT summarize file contents. If none found, return []."
}
```

**Expected RetrieverModel Response:**
```json
[{
  "path": "backend/server.py",
  "ref": "main",
  "blob_url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py",
  "start_line": 1,
  "end_line": 1542,
  "confidence": 1.0
}]
```

#### Step 2: ExtractorModel Call
```json
{
  "model": "ExtractorModel",
  "prompt": "You are ExtractorModel. Fetch verbatim the content from https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py for lines 1-1542.\n\nINPUT:\n- blob_url: https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py\n- start_line: 1\n- end_line: 1542\n- path: backend/server.py\n- ref: main\n\nReturn JSON with path, ref, blob_sha, start_line, end_line, raw_lines. Do not add commentary."
}
```

**Expected ExtractorModel Response:**
```json
{
  "path": "backend/server.py",
  "ref": "main",
  "blob_sha": "a1b2c3d4e5f6789...",
  "start_line": 1,
  "end_line": 1542,
  "raw_lines": "from fastapi import FastAPI, HTTPException\nfrom fastapi.middleware.cors import CORSMiddleware\n... [full file content verbatim] ..."
}
```

#### Step 3: VerifierModel Call
```json
{
  "model": "VerifierModel",
  "prompt": "You are VerifierModel. Independently fetch https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py#L1-L1542 and confirm the raw lines exactly match the ExtractorModel output.\n\nINPUT:\n- blob_url: https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py\n- start_line: 1\n- end_line: 1542\n- expected_raw_lines: from fastapi import FastAPI...\n\nReturn JSON with match:true|false, confirmed_raw_lines, blob_sha, reason (if mismatch)."
}
```

**Expected VerifierModel Response:**
```json
{
  "match": true,
  "confirmed_raw_lines": "from fastapi import FastAPI...",
  "blob_sha": "a1b2c3d4e5f6789...",
  "path": "backend/server.py",
  "ref": "main",
  "verified_at": "2025-10-26T02:39:19Z"
}
```

#### Step 4: ComposerModel Call
```json
{
  "model": "ComposerModel",
  "prompt": "You are ComposerModel. Build the global Output Schema JSON using only verified entries (match:true).\n\nINPUT:\n- verified_entries: [{path: 'backend/server.py', raw_lines: '...', match: true, ...}]\n- requested_fields: ['file_content', 'file_path', 'lines_count']\n- query: Get file backend/server.py\n\nFor any missing fields, set to 'NOT_AVAILABLE'. Include sources[] with exact blob urls, ref, path, blob_sha, raw_content_snippet."
}
```

**Expected ComposerModel Response:**
```json
{
  "status": "success",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {
    "file_content": "from fastapi import FastAPI, HTTPException\n...",
    "file_path": "backend/server.py",
    "lines_count": 1542
  },
  "sources": [{
    "type": "git_blob",
    "url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py",
    "ref": "main",
    "path": "backend/server.py",
    "blob_sha": "a1b2c3d4e5f6789",
    "raw_content_snippet": "from fastapi import FastAPI, HTTPException\nfrom fastapi.middleware.cors import CORSMiddleware\n..."
  }],
  "message": "File retrieved successfully"
}
```

#### Step 5: AuditorModel Call
```json
{
  "model": "AuditorModel",
  "prompt": "You are AuditorModel. Run final guardrail checks on the response:\n\nINPUT:\n- response: {status: 'success', fetched_at: '2025-10-26T02:39:19Z', ...}\n- role: admin\n\nValidate: timestamp format, source URLs present, schema compliance, no extra narrative, NOT_AVAILABLE usage, raw content match. If any check fails, return error."
}
```

**Expected AuditorModel Response:**
```json
{
  "status": "success",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {
    "file_content": "from fastapi import FastAPI, HTTPException\n...",
    "file_path": "backend/server.py",
    "lines_count": 1542
  },
  "sources": [{
    "type": "git_blob",
    "url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py",
    "ref": "main",
    "path": "backend/server.py",
    "blob_sha": "a1b2c3d4e5f6789",
    "raw_content_snippet": "from fastapi import FastAPI, HTTPException\nfrom fastapi.middleware.cors import CORSMiddleware\n..."
  }],
  "message": "File retrieved successfully"
}
```

**Final Response to User:**
```json
{
  "status": "success",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {
    "file_content": "from fastapi import FastAPI, HTTPException\nfrom fastapi.middleware.cors import CORSMiddleware\nimport uvicorn\nfrom sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Float, Text, ForeignKey\nfrom sqlalchemy.ext.declarative import declarative_base\nfrom sqlalchemy.orm import sessionmaker, relationship\nfrom datetime import datetime, timedelta\nfrom passlib.context import CryptContext\nfrom jose import JWTError, jwt\nfrom typing import Optional, List\nimport os\nfrom pydantic import BaseModel\n...[continuing with full file content]...",
    "file_path": "backend/server.py",
    "lines_count": 1542
  },
  "sources": [{
    "type": "git_blob",
    "url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py",
    "ref": "main",
    "path": "backend/server.py",
    "blob_sha": "a1b2c3d4e5f6789",
    "raw_content_snippet": "from fastapi import FastAPI, HTTPException\nfrom fastapi.middleware.cors import CORSMiddleware\n..."
  }],
  "message": "File retrieved successfully"
}
```

---

### Example 2: Get Specific Lines

**User Input:**
```json
{
  "role": "admin",
  "action": "get_lines",
  "repo": "MIHAchoppa/lvl-up-agency",
  "path": "backend/server.py",
  "line_range": "45-60",
  "ref": "main"
}
```

**Coordinator Flow:** (Similar to Example 1, but with specific line range)

**Final Response:**
```json
{
  "status": "success",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {
    "lines": "def authenticate_user(username: str, password: str):\n    user = db.query(User).filter(User.username == username).first()\n    if not user:\n        return None\n    if not verify_password(password, user.hashed_password):\n        return None\n    return user",
    "start_line": 45,
    "end_line": 60,
    "file_path": "backend/server.py"
  },
  "sources": [{
    "type": "git_blob",
    "url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py",
    "ref": "main",
    "path": "backend/server.py",
    "blob_sha": "a1b2c3d4e5f6789",
    "line_range": "45-60",
    "raw_content_snippet": "def authenticate_user(username: str, password: str):\n    user = db.query(User).filter(User.username == username).first()..."
  }],
  "message": "Lines 45-60 retrieved successfully"
}
```

---

### Example 3: File Not Found

**User Input:**
```json
{
  "role": "admin",
  "action": "get_file",
  "repo": "MIHAchoppa/lvl-up-agency",
  "path": "src/nonexistent.js"
}
```

**RetrieverModel Response:**
```json
[]
```

**Final Response:**
```json
{
  "status": "not_available",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {},
  "sources": [],
  "message": "NOT_AVAILABLE: file not found at specified path 'src/nonexistent.js' in MIHAchoppa/lvl-up-agency"
}
```

---

## AI Coach Examples

### Example 4: Find Implementation (Raw Data Only)

**User Input:**
```json
{
  "role": "coach",
  "action": "find",
  "query": "Where is authentication implemented?",
  "repo": "MIHAchoppa/lvl-up-agency",
  "include_coaching": false
}
```

**RetrieverModel Call:**
```json
{
  "model": "RetrieverModel",
  "prompt": "You are RetrieverModel. Given this full-sentence user query: 'Where is authentication implemented in this repository?', in repo 'MIHAchoppa/lvl-up-agency', find candidate files/blob URLs and exact line ranges that are relevant to the coaching question.\n\nReturn JSON array with path, ref, blob_url, start_line, end_line, relevance."
}
```

**RetrieverModel Response:**
```json
[
  {
    "path": "backend/server.py",
    "ref": "main",
    "blob_url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py",
    "start_line": 45,
    "end_line": 60,
    "relevance": "Main authentication function"
  },
  {
    "path": "backend/server.py",
    "ref": "main",
    "blob_url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py",
    "start_line": 120,
    "end_line": 135,
    "relevance": "Login endpoint"
  }
]
```

**CoachExtractorModel Calls:** (Parallel for each candidate)

**Final Response:**
```json
{
  "status": "success",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {
    "matches": [
      {
        "path": "backend/server.py",
        "start_line": 45,
        "end_line": 60,
        "raw_lines": "def authenticate_user(username: str, password: str):\n    user = db.query(User).filter(User.username == username).first()\n    if not user:\n        return None\n    if not verify_password(password, user.hashed_password):\n        return None\n    return user",
        "relevance": "Main authentication function that validates user credentials"
      },
      {
        "path": "backend/server.py",
        "start_line": 120,
        "end_line": 135,
        "raw_lines": "@app.post('/api/auth/login')\nasync def login(credentials: LoginCredentials):\n    user = authenticate_user(credentials.username, credentials.password)\n    if not user:\n        raise HTTPException(status_code=401, detail='Invalid credentials')\n    token = create_access_token(data={'sub': user.username})\n    return {'access_token': token, 'token_type': 'bearer'}",
        "relevance": "Login endpoint that uses authentication and returns JWT token"
      }
    ]
  },
  "sources": [
    {
      "type": "git_blob",
      "url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py",
      "ref": "main",
      "path": "backend/server.py",
      "blob_sha": "a1b2c3d4e5f6789",
      "line_range": "45-60",
      "raw_content_snippet": "def authenticate_user(username: str, password: str):\n    user = db.query(User).filter(User.username == username).first()..."
    },
    {
      "type": "git_blob",
      "url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py",
      "ref": "main",
      "path": "backend/server.py",
      "blob_sha": "a1b2c3d4e5f6789",
      "line_range": "120-135",
      "raw_content_snippet": "@app.post('/api/auth/login')\nasync def login(credentials: LoginCredentials)..."
    }
  ],
  "message": "Found 2 relevant code sections"
}
```

---

### Example 5: With Coaching Guidance

**User Input:**
```json
{
  "role": "coach",
  "action": "explain",
  "query": "How can I add a new authentication provider like OAuth?",
  "repo": "MIHAchoppa/lvl-up-agency",
  "include_coaching": true
}
```

**Additional Step: SynthesisModel Call**
```json
{
  "model": "SynthesisModel",
  "prompt": "You are SynthesisModel (restricted mode). Provide coaching guidance based ONLY on verified code snippets.\n\nINPUT:\n- verified_entries: [{path: 'backend/server.py', lines: 45-60, raw_lines: 'def authenticate_user...', ...}]\n- coaching_question: How can I add OAuth authentication?\n\nPresent raw sources FIRST, then provide labeled coaching (SUGGESTION/INFERENCE/HYPOTHESIS) with source references."
}
```

**SynthesisModel Response:**
```json
{
  "raw_matches": [
    {
      "path": "backend/server.py",
      "start_line": 45,
      "end_line": 60,
      "raw_lines": "def authenticate_user(username: str, password: str):\n    user = db.query(User).filter(User.username == username).first()\n    if not user:\n        return None\n    if not verify_password(password, user.hashed_password):\n        return None\n    return user",
      "relevance": "Current password-based authentication pattern"
    }
  ],
  "coaching": {
    "type": "SUGGESTION",
    "steps": [
      {
        "step": 1,
        "action": "Create new authentication function alongside authenticate_user (lines 45-60)",
        "suggestion": "Add def authenticate_oauth(provider: str, token: str) following the same return pattern",
        "reference_lines": "45-60",
        "reference_file": "backend/server.py"
      },
      {
        "step": 2,
        "action": "Add new endpoint similar to /api/auth/login (lines 120-135)",
        "suggestion": "Create @app.post('/api/auth/oauth/{provider}') endpoint",
        "reference_lines": "120-135",
        "reference_file": "backend/server.py"
      },
      {
        "step": 3,
        "action": "HYPOTHESIS - Verification needed",
        "suggestion": "May need to add OAuth library. Check requirements.txt",
        "verification_steps": [
          "View backend/requirements.txt",
          "Check if OAuth libraries present",
          "Research authlib or python-oauth2"
        ]
      }
    ]
  }
}
```

**Final Response:**
```json
{
  "status": "success",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {
    "matches": [
      {
        "path": "backend/server.py",
        "start_line": 45,
        "end_line": 60,
        "raw_lines": "def authenticate_user(username: str, password: str):\n    user = db.query(User).filter(User.username == username).first()\n    if not user:\n        return None\n    if not verify_password(password, user.hashed_password):\n        return None\n    return user",
        "relevance": "Current password-based authentication"
      },
      {
        "path": "backend/server.py",
        "start_line": 120,
        "end_line": 135,
        "raw_lines": "@app.post('/api/auth/login')\nasync def login(credentials: LoginCredentials):\n    user = authenticate_user(credentials.username, credentials.password)\n    if not user:\n        raise HTTPException(status_code=401, detail='Invalid credentials')\n    token = create_access_token(data={'sub': user.username})\n    return {'access_token': token, 'token_type': 'bearer'}",
        "relevance": "Login endpoint structure"
      }
    ],
    "coaching": {
      "type": "SUGGESTION",
      "steps": [
        {
          "step": 1,
          "action": "Create new authentication function alongside existing authenticate_user (lines 45-60 in backend/server.py)",
          "suggestion": "Add def authenticate_oauth(provider: str, token: str) that validates the OAuth token and returns a user object following the same pattern",
          "reference_lines": "45-60",
          "reference_file": "backend/server.py"
        },
        {
          "step": 2,
          "action": "Add new endpoint similar to /api/auth/login (lines 120-135 in backend/server.py)",
          "suggestion": "Create @app.post('/api/auth/oauth/{provider}') endpoint that accepts provider and token",
          "reference_lines": "120-135",
          "reference_file": "backend/server.py"
        },
        {
          "step": 3,
          "action": "HYPOTHESIS - Verification needed",
          "suggestion": "You may need to add OAuth library dependency (e.g., authlib). Check requirements.txt to see current dependencies.",
          "verification_steps": [
            "View backend/requirements.txt",
            "Check if OAuth libraries are present",
            "If not present, research authlib or python-oauth2 libraries"
          ]
        }
      ],
      "implementation_pattern": "Follow the existing pattern in lines 45-60 and 120-135, but adapt for OAuth token validation instead of password verification"
    }
  },
  "sources": [
    {
      "type": "git_blob",
      "url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py",
      "ref": "main",
      "path": "backend/server.py",
      "blob_sha": "a1b2c3d4e5f6789",
      "line_range": "45-60",
      "raw_content_snippet": "def authenticate_user(username: str, password: str):\n    user = db.query(User).filter(User.username == username).first()..."
    },
    {
      "type": "git_blob",
      "url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py",
      "ref": "main",
      "path": "backend/server.py",
      "blob_sha": "a1b2c3d4e5f6789",
      "line_range": "120-135",
      "raw_content_snippet": "@app.post('/api/auth/login')\nasync def login(credentials: LoginCredentials)..."
    }
  ],
  "message": "Found 2 relevant sections with coaching guidance"
}
```

---

## Semantic Code Search Integration Example

### Example 6: Using semantic-code-search Tool

**User Input:**
```json
{
  "role": "admin",
  "action": "search",
  "query": "Where is authentication implemented?",
  "repo": "MIHAchoppa/lvl-up-agency"
}
```

**semantic-code-search Call:**
```json
{
  "tool": "semantic-code-search",
  "params": {
    "query": "Where is authentication implemented in this repository?",
    "repoOwner": "MIHAchoppa",
    "repoName": "lvl-up-agency"
  }
}
```

**semantic-code-search Response:**
```json
{
  "matches": [
    {
      "file_path": "backend/server.py",
      "line_range": "45-60",
      "raw_lines": "def authenticate_user(username: str, password: str):\n    user = db.query(User).filter(User.username == username).first()\n    if not user:\n        return None\n    if not verify_password(password, user.hashed_password):\n        return None\n    return user",
      "blob_sha": "a1b2c3d4e5f6789",
      "source_url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py",
      "score": 0.98
    }
  ]
}
```

**Then proceed with VerifierModel to confirm:**

**VerifierModel Call:**
```json
{
  "model": "VerifierModel",
  "prompt": "Independently fetch https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py#L45-L60 and confirm exact match with semantic-code-search result."
}
```

**Final Response:** (Same format as previous examples with verified data)

---

## Summary: Coordinator Payload Pattern

For every request, the coordinator should:

1. **Parse user input** → Extract role, action, query, repo, path, ref
2. **Call RetrieverModel** → Get candidates
3. **Call Extractor** (parallel) → Fetch raw content for each candidate
4. **Call VerifierModel** (parallel) → Confirm each extraction
5. **Call SynthesisModel** (if Coach + coaching requested) → Generate coaching
6. **Call ComposerModel** → Build Global Output Schema
7. **Call AuditorModel** → Validate response
8. **Return to user** → Final validated response

All responses must follow the Global Output Schema with:
- `status`: "success" | "not_available" | "error"
- `fetched_at`: UTC ISO8601 timestamp
- `data`: Requested data or empty object
- `sources`: Array of source objects with full metadata
- `message`: Human-readable status

---

## Quick Copy-Paste Templates

### Admin Request Template
```json
{
  "role": "admin",
  "action": "get_file",
  "repo": "MIHAchoppa/lvl-up-agency",
  "path": "<FILE_PATH>",
  "ref": "main"
}
```

### Coach Request Template (No Coaching)
```json
{
  "role": "coach",
  "action": "find",
  "query": "<YOUR_QUESTION>",
  "repo": "MIHAchoppa/lvl-up-agency",
  "include_coaching": false
}
```

### Coach Request Template (With Coaching)
```json
{
  "role": "coach",
  "action": "explain",
  "query": "<YOUR_QUESTION>",
  "repo": "MIHAchoppa/lvl-up-agency",
  "include_coaching": true
}
```

---

These examples should give you a complete picture of how to structure coordinator calls and what to expect at each step of the orchestration pipeline.
