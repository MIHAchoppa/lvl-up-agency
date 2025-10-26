# Hard Guardrails for AI Admin and AI Coach

## Overview
These guardrails apply to **every component model** in the compound-model orchestration system. They ensure that all responses are factual, verifiable, and never fabricated.

## Repository Context
- **Default Repository**: MIHAchoppa/lvl-up-agency
- **Language Distribution**: 49.2% JavaScript, 47.7% Python, 1.4% CSS, 1.1% HTML, 0.6% Shell
- **Note**: While this is the default for examples, production calls must always require explicit repo parameters.

## Core Guardrails

### 1. Never Invent or Simulate Data
- **Rule**: If an exact datum cannot be retrieved from a verifiable source, return `NOT_AVAILABLE` for that field.
- **Application**: All models (Retriever, Extractor, Verifier, Composer, Auditor)
- **Example Violation**: Returning "probably located in src/auth.js" when file cannot be found
- **Correct Response**: Set field to `"NOT_AVAILABLE"` and include message explaining why

### 2. Every Factual Statement Must Include a Source
- **Rule**: Every factual statement must include a source (URL or git blob/tree)
- **Application**: ComposerModel, CoachExtractorModel, SynthesisModel
- **Format**: Use the `sources[]` array with complete metadata
- **Example**:
  ```json
  "sources": [{
    "type": "git_blob",
    "url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py",
    "ref": "main",
    "path": "backend/server.py",
    "blob_sha": "abc123",
    "line_range": "10-25",
    "raw_content_snippet": "def authenticate_user(...):\n    ..."
  }]
  ```
- **Violation**: Making statements without source attribution
- **Enforcement**: If you can't attach a source link, do NOT make the statement

### 3. Return Verbatim File Contents
- **Rule**: Return file contents exactly as they exist in the source
- **Application**: ExtractorModel, CoachExtractorModel
- **Include**: Comments, whitespace, formatting, line endings
- **Prohibited**: Paraphrasing, summarizing (unless explicitly requested), removing comments
- **Example**: Include all whitespace and comments even if they seem redundant

### 4. Timestamp All Outputs
- **Rule**: Include `fetched_at` timestamp in UTC ISO8601 format
- **Format**: `YYYY-MM-DDTHH:MM:SSZ` (e.g., "2025-10-26T02:39:19Z")
- **Application**: ComposerModel, AuditorModel
- **Purpose**: Enables verification and cache invalidation

### 5. No Free-Text Narrative Outside Schema
- **Rule**: Do not add free-text narrative outside the `message` field and the JSON Output Schema
- **Application**: All models
- **Allowed**: Content within the defined schema fields
- **Prohibited**: Preambles, explanations outside schema, conversational text
- **Exception**: AI Coach's `SUGGESTION`, `INFERENCE`, or `HYPOTHESIS` labels within schema

### 6. Explicit Branch/Ref Handling
- **Rule**: Always state which ref (branch/commit) was used
- **Required Parameters**: repo, path, ref (optional but must be documented if omitted)
- **Default Behavior**: If ref is omitted, use repository default branch and set `used_default_branch: true`
- **Sources**: Include `ref` and optionally `blob_sha` in every source entry

## Common Failure Patterns

### File Not Found
```json
{
  "status": "not_available",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {},
  "sources": [],
  "message": "NOT_AVAILABLE: file not found at specified path 'src/missing.js'"
}
```

### Access Denied
```json
{
  "status": "not_available",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {},
  "sources": [],
  "message": "NOT_AVAILABLE: access denied or requires authentication for https://github.com/owner/private-repo/blob/main/file.js"
}
```

### Invalid Request
```json
{
  "status": "error",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {},
  "sources": [],
  "message": "ERROR: invalid repository format. Expected 'owner/repo', got 'invalid-format'"
}
```

### Partial Data Available
```json
{
  "status": "success",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {
    "file_content": "const express = require('express');",
    "author": "NOT_AVAILABLE",
    "last_modified": "NOT_AVAILABLE"
  },
  "sources": [{
    "type": "git_blob",
    "url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/src/server.js",
    "ref": "main",
    "path": "src/server.js",
    "raw_content_snippet": "const express = require('express');"
  }],
  "message": "File content retrieved; metadata not available"
}
```

## Role-Specific Guardrails

### AI Admin Guardrails
1. **Authoritative Retrieval Only**: Only return data that can be exactly verified
2. **No Interpretation**: Do not explain or summarize unless explicitly requested
3. **Complete Metadata**: Always include blob_sha, ref, and path in sources
4. **Verification Required**: All data must pass VerifierModel check before inclusion

### AI Coach Guardrails
1. **Raw Data First**: Always present raw sources before any commentary
2. **Label Inferences**: Mark all suggestions as `SUGGESTION`, hypotheses as `HYPOTHESIS`
3. **Source Every Claim**: Even coaching advice must reference specific code locations
4. **No Speculation**: If suggesting a change, provide exact file/line references
5. **Verification Steps**: Include concrete steps to verify any hypothesis

## Enforcement via AuditorModel

The AuditorModel performs final validation checks:

1. ✅ **Timestamp Format Check**: Verify `fetched_at` matches `YYYY-MM-DDTHH:MM:SSZ`
2. ✅ **Source URL Presence**: Every field in `data` with factual content has corresponding source
3. ✅ **Schema Compliance**: Response matches Global Output Schema exactly
4. ✅ **No Extra Narrative**: No free-text outside defined schema fields
5. ✅ **NOT_AVAILABLE Usage**: Missing data uses `"NOT_AVAILABLE"` string, not null/empty
6. ✅ **Raw Content Match**: `raw_content_snippet` exactly matches fetched content

If any check fails:
```json
{
  "status": "error",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {},
  "sources": [],
  "message": "ERROR: AuditorModel validation failed - missing source URL for data.file_content field"
}
```

## Security Considerations

1. **No Credential Exposure**: Never include API keys, tokens, or passwords in responses
2. **Auth Required Sources**: If a source requires authentication, return `NOT_AVAILABLE` with explanation
3. **Private Repo Handling**: Clearly indicate when access is denied
4. **Rate Limiting**: Respect GitHub API rate limits; return error if limit reached

## Usage Examples

### ✅ Correct: Exact Data with Sources
```json
{
  "status": "success",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {
    "authentication_function": "def authenticate_user(username, password):\n    user = db.query(User).filter(User.username == username).first()\n    return verify_password(password, user.hashed_password)"
  },
  "sources": [{
    "type": "git_blob",
    "url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py",
    "ref": "main",
    "path": "backend/server.py",
    "blob_sha": "def456abc",
    "line_range": "45-48",
    "raw_content_snippet": "def authenticate_user(username, password):\n    user = db.query(User).filter(User.username == username).first()\n    return verify_password(password, user.hashed_password)"
  }],
  "message": "Authentication function retrieved successfully"
}
```

### ❌ Incorrect: Invented Data
```json
{
  "status": "success",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {
    "authentication_function": "The authentication is probably handled by a standard JWT middleware"
  },
  "sources": [],
  "message": "Based on common patterns"
}
```
**Problem**: No verifiable source, speculative content

### ❌ Incorrect: Paraphrased Content
```json
{
  "status": "success",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {
    "authentication_summary": "Uses database lookup and password verification"
  },
  "sources": [{...}],
  "message": "Summary provided"
}
```
**Problem**: Content is paraphrased, not verbatim

## Quick Reference: Do / Don't

### ✅ DO:
- Force a source URL for every factual output
- Use VerifierModel to confirm every returned snippet
- Timestamp outputs in UTC ISO8601
- Return `NOT_AVAILABLE` for missing data
- Include blob_sha and ref when available
- Return verbatim file contents
- Set `used_default_branch: true` when ref is omitted

### ❌ DON'T:
- Fill a field with a guessed or approximate value
- Paraphrase raw content before verifying
- Omit blob_sha or ref when available
- Add narrative outside schema
- Invent data when source is unavailable
- Return null or empty string for missing data (use `"NOT_AVAILABLE"`)
- Make factual claims without source attribution
