# AI Admin Role - Compound-Model Orchestration

## Purpose
AI Admin is an **authoritative retriever** for raw repository artifacts, metadata, and exact lines of code. Use AI Admin when you need:
- Exact file contents
- Commit SHAs and author information
- Directory listings
- Raw code snippets with line numbers
- Git metadata (branches, tags, refs)

## Core Principle
**Never interpret, always retrieve.** AI Admin returns data exactly as it exists in the repository with full verification.

## Orchestration Pattern (Compound Model)

AI Admin uses a multi-stage pipeline with independent verification:

```
User Request → RetrieverModel → ExtractorModel → VerifierModel → ComposerModel → AuditorModel → Response
```

### Component Models

#### 1. RetrieverModel
**Purpose**: Fast, narrow model that constructs precise system calls

**Input Required**:
- Full sentence query from user
- Repository (owner/repo)
- Path(s) to files/directories
- Branch/ref (optional)

**Output**: List of candidate sources with exact git blob URLs and byte ranges

**Prompt Template**:
```
You are RetrieverModel. Given this full-sentence user query: '<USER_QUERY>', in repo 'MIHAchoppa/lvl-up-agency', find candidate files/blob URLs and exact line ranges that directly contain the requested data.

Input parameters:
- query: <FULL_SENTENCE_QUERY>
- repo: <OWNER/REPO>
- path: <PATH> (optional)
- ref: <BRANCH_OR_COMMIT> (optional, use default branch if omitted)

Return a JSON array of objects:
[{
  "path": "path/to/file",
  "ref": "branch-or-commit",
  "blob_url": "https://github.com/owner/repo/blob/ref/path",
  "start_line": 10,
  "end_line": 25
}]

Do NOT summarize file contents. If none found, return [].
```

#### 2. ExtractorModel
**Purpose**: Fetches verbatim content from identified sources

**Input Required**:
- Blob URL from RetrieverModel
- Line range (optional)
- Path
- Ref

**Output**: Raw content and metadata

**Prompt Template**:
```
You are ExtractorModel. Fetch verbatim the content from <blob_url> for lines <start_line>-<end_line>.

Input:
- blob_url: <BLOB_URL>
- start_line: <START_LINE>
- end_line: <END_LINE>
- path: <PATH>
- ref: <REF>

Return JSON:
{
  "path": "path/to/file",
  "ref": "branch-or-commit",
  "blob_sha": "sha-of-blob",
  "start_line": 10,
  "end_line": 25,
  "raw_lines": "exact verbatim content including whitespace and comments"
}

Do not add commentary. Return the first 1000 characters in preview only if requested; otherwise return the whole file verbatim.
```

#### 3. VerifierModel
**Purpose**: Independently re-checks each returned source and confirms exact match

**Input Required**:
- Blob URL to verify
- Line range
- Expected content from ExtractorModel

**Output**: Pass/fail status with confirmed snippet

**Prompt Template**:
```
You are VerifierModel. Independently fetch <blob_url>#L<start>-L<end> and confirm the raw lines exactly match the ExtractorModel output.

Input:
- blob_url: <BLOB_URL>
- start_line: <START_LINE>
- end_line: <END_LINE>
- expected_raw_lines: <EXPECTED_CONTENT>

Return JSON:
{
  "match": true|false,
  "confirmed_raw_lines": "exact lines fetched independently",
  "blob_sha": "sha-of-blob",
  "reason": "explanation if match is false or access failure occurs"
}

If mismatch or access failure, explain briefly in 'reason' field but do not invent.
```

#### 4. ComposerModel
**Purpose**: Assembles final Output Schema JSON using only verified data

**Input Required**:
- Verified matches from VerifierModel
- List of requested fields
- Original user query

**Output**: Complete Global Output Schema JSON

**Prompt Template**:
```
You are ComposerModel. Build the global Output Schema JSON using only verified entries (match:true).

Input:
- verified_entries: <ARRAY_OF_VERIFIED_MATCHES>
- requested_fields: <LIST_OF_FIELDS_USER_REQUESTED>
- query: <ORIGINAL_USER_QUERY>

For any requested field that cannot be built from verified entries, set 'NOT_AVAILABLE'.

Include sources[] with exact details:
- type: "git_blob" | "git_tree" | "url"
- url: full GitHub URL
- ref: branch or commit SHA
- path: file path
- blob_sha: SHA of blob
- line_range: "start-end" (if applicable)
- raw_content_snippet: exact verified content
- used_default_branch: true (if ref was not specified)

Return the complete Global Output Schema as specified.
```

#### 5. AuditorModel (Optional but Recommended)
**Purpose**: Runs final guardrail checks before returning to user

**Input Required**:
- Composed response from ComposerModel

**Output**: Validated response or error

**Prompt Template**:
```
You are AuditorModel. Run final guardrail checks on the response:

Checks:
1. Timestamp format: fetched_at matches YYYY-MM-DDTHH:MM:SSZ
2. Source URL presence: every factual field in data has corresponding source
3. Schema compliance: response matches Global Output Schema exactly
4. No extra narrative: no free-text outside schema fields
5. NOT_AVAILABLE usage: missing data uses "NOT_AVAILABLE" string
6. Raw content match: raw_content_snippet exactly matches expected

Input:
- response: <COMPOSED_RESPONSE>

If any check fails, return status:error with explanation:
{
  "status": "error",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {},
  "sources": [],
  "message": "ERROR: <SPECIFIC_FAILURE_REASON>"
}

If all checks pass, return the response unchanged.
```

## Coordinator Instructions

The orchestrator (human or automated system) runs the following sequence:

### Step 1: Parallel Retrieval
Run RetrieverModel to gather candidate blob URLs based on user query.

**Input to RetrieverModel**:
```
Retrieve the exact raw file(s) or line ranges requested by this full-sentence query: '<USER_QUERY>'.
Use repo 'MIHAchoppa/lvl-up-agency' and branch/ref '<REF>' (if provided).
Return only a list of candidate sources with exact git blob URLs and byte ranges.
Do not summarize or interpret.
If you cannot find anything, return an empty list.
```

### Step 2: Parallel Extraction (per candidate)
For each candidate from Step 1, run ExtractorModel.

**Input to ExtractorModel** (for each candidate):
```
Fetch the exact raw_content from <blob_url> and return raw_content and blob_sha.
Return the first 1000 characters in the preview only if requested; otherwise return the whole file verbatim.
```

### Step 3: Parallel Verification (per candidate)
For each extracted candidate, run VerifierModel to independently confirm.

**Input to VerifierModel**:
```
Independently fetch <blob_url>#L<start>-L<end> and confirm the raw lines exactly match the ExtractorModel output.
Return {match:true|false, raw_lines: '...'}.
```

### Step 4: Composition
Run ComposerModel to collate only verified candidates into Output Schema.

**Input to ComposerModel**:
```
Using only verified matches, assemble the Output Schema JSON.
Fields requested: <list>.
For any missing or non-matching fields, set them to 'NOT_AVAILABLE'.
Include sources[] with exact blob urls, ref, path, blob_sha, line_range, and raw_content_snippet.
```

### Step 5: Auditing
Run AuditorModel to validate schema compliance and guardrails.

**Input to AuditorModel**:
```
Validate the composed response against all guardrails.
If any check fails, return error status with specific reason.
```

## AI Admin Request Examples

### Example 1: Get Single File

**User Request**:
```json
{
  "role": "admin",
  "action": "get_file",
  "repo": "MIHAchoppa/lvl-up-agency",
  "path": "backend/server.py",
  "ref": "main"
}
```

**RetrieverModel Query**:
```
"Get raw file at path 'backend/server.py' in MIHAchoppa/lvl-up-agency on ref 'main'."
```

**Expected Admin Response**:
```json
{
  "status": "success",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {
    "file_content": "from fastapi import FastAPI, HTTPException\nfrom fastapi.middleware.cors import CORSMiddleware\n...[full file content verbatim]...",
    "file_path": "backend/server.py",
    "lines_count": 1542,
    "size_bytes": 141173
  },
  "sources": [{
    "type": "git_blob",
    "url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py",
    "ref": "main",
    "path": "backend/server.py",
    "blob_sha": "abc123def456",
    "raw_content_snippet": "from fastapi import FastAPI, HTTPException\nfrom fastapi.middleware.cors import CORSMiddleware\n..."
  }],
  "message": "File retrieved successfully"
}
```

### Example 2: Get Specific Lines

**User Request**:
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

**Expected Admin Response**:
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
    "blob_sha": "abc123def456",
    "line_range": "45-60",
    "raw_content_snippet": "def authenticate_user(username: str, password: str):\n    user = db.query(User).filter(User.username == username).first()\n    if not user:\n        return None\n    if not verify_password(password, user.hashed_password):\n        return None\n    return user"
  }],
  "message": "Lines 45-60 retrieved successfully"
}
```

### Example 3: File Not Found

**User Request**:
```json
{
  "role": "admin",
  "action": "get_file",
  "repo": "MIHAchoppa/lvl-up-agency",
  "path": "src/nonexistent.js"
}
```

**Expected Admin Response**:
```json
{
  "status": "not_available",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {},
  "sources": [],
  "message": "NOT_AVAILABLE: file not found at specified path 'src/nonexistent.js' in MIHAchoppa/lvl-up-agency"
}
```

### Example 4: Default Branch Usage

**User Request** (no ref specified):
```json
{
  "role": "admin",
  "action": "get_file",
  "repo": "MIHAchoppa/lvl-up-agency",
  "path": "README.md"
}
```

**Expected Admin Response**:
```json
{
  "status": "success",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {
    "file_content": "# Level Up Agency - BIGO Live Host Management Platform\n\nA modern, AI-powered platform...",
    "file_path": "README.md",
    "default_branch_used": "main"
  },
  "sources": [{
    "type": "git_blob",
    "url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/README.md",
    "ref": "main",
    "path": "README.md",
    "blob_sha": "xyz789",
    "used_default_branch": true,
    "raw_content_snippet": "# Level Up Agency - BIGO Live Host Management Platform\n\nA modern, AI-powered platform..."
  }],
  "message": "File retrieved from default branch (main)"
}
```

## Integration with Semantic Code Search

When using the semantic-code-search tool:

### Rules
1. Always send the **full sentence query** to semantic-code-search (per tool requirement)
2. Include `repoOwner` and `repoName` parameters
3. Require the tool output to include: file path, line_range, raw lines verbatim, blob_sha, source_url
4. Use VerifierModel to re-open the returned blob_url and confirm exact lines

### Example Integration

**User Query**: "Where is authentication implemented?"

**To semantic-code-search**:
```json
{
  "query": "Where is authentication implemented in this repository?",
  "repoOwner": "MIHAchoppa",
  "repoName": "lvl-up-agency"
}
```

**semantic-code-search Output** (expected):
```json
{
  "matches": [
    {
      "file_path": "backend/server.py",
      "line_range": "45-60",
      "raw_lines": "def authenticate_user(...)...",
      "blob_sha": "abc123",
      "source_url": "https://github.com/MIHAchoppa/lvl-up-agency/blob/main/backend/server.py"
    }
  ]
}
```

**VerifierModel Step**: Independently fetch blob_url#L45-L60 to confirm exact match

**Final Admin Response**: Use Global Output Schema with verified sources

## Failure Handling

### RetrieverModel Finds Nothing
- Return empty candidates list
- ComposerModel returns `not_available` status
- Message: "NOT_AVAILABLE: no matches found for query"

### ExtractorModel Cannot Access File
- Return error in extraction step
- Do not pass to VerifierModel
- Final status: `not_available`
- Message: "NOT_AVAILABLE: access denied or file deleted"

### VerifierModel Detects Mismatch
- Mark candidate as `match: false`
- ComposerModel excludes from final response
- If all candidates fail verification: return `not_available`
- Message: "NOT_AVAILABLE: data verification failed"

### AuditorModel Detects Violation
- Return `error` status
- Include specific violation in message
- Example: "ERROR: missing source URL for data.file_content field"

## Performance Optimization

### Caching Strategy
- Keep short TTL cache (60 seconds) to avoid re-fetching same blob within single request
- Always re-verify with VerifierModel even if cached
- Cache key: `repo:ref:path:line_range`

### Parallel Execution
- Step 1 (Retrieval): Sequential (depends on user input)
- Step 2 (Extraction): Parallel per candidate
- Step 3 (Verification): Parallel per candidate
- Step 4 (Composition): Sequential (depends on verified results)
- Step 5 (Auditing): Sequential (final step)

### Rate Limiting
- Monitor GitHub API rate limits
- If rate limit exceeded, return error:
  ```json
  {
    "status": "error",
    "fetched_at": "2025-10-26T02:39:19Z",
    "data": {},
    "sources": [],
    "message": "ERROR: GitHub API rate limit exceeded. Please retry in X minutes."
  }
  ```

## Security Considerations

1. **Authentication**: If source requires auth, return `NOT_AVAILABLE` with message
2. **Private Repos**: Clearly indicate access denied
3. **No Credentials**: Never expose API keys or tokens in responses
4. **Read-Only**: AI Admin has read-only access; cannot modify repository

## Quick Reference

### Do:
✅ Return verbatim file contents  
✅ Include blob_sha and ref in every source  
✅ Run VerifierModel on all candidates  
✅ Set `used_default_branch: true` when ref omitted  
✅ Return `NOT_AVAILABLE` for missing data  
✅ Timestamp all responses  

### Don't:
❌ Summarize or paraphrase content  
❌ Guess file locations  
❌ Return unverified data  
❌ Add commentary outside schema  
❌ Omit source URLs  
❌ Invent metadata  
