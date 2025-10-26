# AI Orchestration System - Quick Reference

## Quick Do / Don't Guide

### ✅ DO:

**For All Roles:**
- Force a source URL for every factual output
- Use VerifierModel to confirm every returned snippet
- Timestamp outputs in UTC ISO8601 format (YYYY-MM-DDTHH:MM:SSZ)
- Return `"NOT_AVAILABLE"` (string) for missing data
- Include blob_sha and ref when available
- Return verbatim file contents with all whitespace and comments
- Set `used_default_branch: true` when ref is omitted by user

**For AI Admin:**
- Return raw data only, no interpretation
- Include complete metadata (blob_sha, ref, path) in all sources
- Verify all data before including in response

**For AI Coach:**
- Present raw data FIRST, always
- Label all suggestions as SUGGESTION/INFERENCE/HYPOTHESIS
- Include source references for every coaching step
- Provide concrete verification steps for hypotheses

### ❌ DON'T:

**For All Roles:**
- Fill a field with a guessed or approximate value
- Paraphrase raw content before verifying
- Omit blob_sha or ref when available
- Add narrative outside schema
- Invent data when source is unavailable
- Return null or empty string for missing data (use `"NOT_AVAILABLE"` string)
- Make factual claims without source attribution

**For AI Admin:**
- Summarize or interpret content
- Guess file locations or content
- Return unverified data

**For AI Coach:**
- Provide coaching before raw sources
- Make suggestions without source references
- Speculate without labeling as HYPOTHESIS
- Omit verification steps for hypotheses

---

## Component Model Quick Reference

| Component | Purpose | Input | Output | Speed |
|-----------|---------|-------|--------|-------|
| **RetrieverModel** | Find candidates | Query, repo, path, ref | Blob URLs + line ranges | Fast |
| **ExtractorModel** | Fetch content | Blob URL, line range | Verbatim raw content + metadata | Fast |
| **VerifierModel** | Confirm accuracy | Blob URL, expected content | Match status + confirmed content | Medium |
| **ComposerModel** | Build response | Verified entries, fields | Global Output Schema JSON | Fast |
| **AuditorModel** | Validate | Composed response | Pass/fail + validated response | Fast |
| **CoachExtractorModel** | Coach extract | Blob URL, coaching question | Verbatim content + relevance | Medium |
| **SynthesisModel** | Generate coaching | Verified entries, question | Labeled suggestions + steps | Slow |

---

## Response Status Guide

| Status | When to Use | data | sources | message Example |
|--------|-------------|------|---------|-----------------|
| `success` | Data retrieved and verified | Populated | Populated | "File retrieved successfully" |
| `not_available` | Cannot retrieve (not found, no access) | Empty `{}` | Empty `[]` | "NOT_AVAILABLE: file not found at path 'X'" |
| `error` | System error, validation failure | Empty `{}` | Empty `[]` | "ERROR: GitHub API rate limit exceeded" |

---

## Common Error Patterns

### File Not Found
```json
{
  "status": "not_available",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {},
  "sources": [],
  "message": "NOT_AVAILABLE: file not found at specified path"
}
```

### Access Denied
```json
{
  "status": "not_available",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {},
  "sources": [],
  "message": "NOT_AVAILABLE: access denied or requires authentication"
}
```

### Verification Failed
```json
{
  "status": "not_available",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {},
  "sources": [],
  "message": "NOT_AVAILABLE: data verification failed (0/3 candidates verified)"
}
```

### Rate Limit
```json
{
  "status": "error",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {},
  "sources": [],
  "message": "ERROR: GitHub API rate limit exceeded. Resets in 1200 seconds."
}
```

### Audit Failure
```json
{
  "status": "error",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {},
  "sources": [],
  "message": "ERROR: AuditorModel validation failed - missing source URL for data.file_content field"
}
```

---

## Execution Order Cheat Sheet

### AI Admin Flow
```
1. RetrieverModel    → Find blob URLs
2. ExtractorModel    → Fetch raw content (parallel)
3. VerifierModel     → Confirm match (parallel)
4. ComposerModel     → Build output schema
5. AuditorModel      → Validate response
```

### AI Coach Flow (No Coaching)
```
1. RetrieverModel        → Find blob URLs
2. CoachExtractorModel   → Fetch + add relevance (parallel)
3. VerifierModel         → Confirm match (parallel)
4. ComposerModel         → Build output schema
5. AuditorModel          → Validate response
```

### AI Coach Flow (With Coaching)
```
1. RetrieverModel        → Find blob URLs
2. CoachExtractorModel   → Fetch + add relevance (parallel)
3. VerifierModel         → Confirm match (parallel)
4. SynthesisModel        → Generate coaching
5. ComposerModel         → Build output schema with coaching
6. AuditorModel          → Validate response + coaching rules
```

---

## Source Object Template

Every source must include:

```json
{
  "type": "git_blob",
  "url": "https://github.com/owner/repo/blob/ref/path/to/file",
  "ref": "branch-or-commit-sha",
  "path": "path/to/file",
  "blob_sha": "abc123...",
  "line_range": "10-25",
  "raw_content_snippet": "exact verbatim text from source",
  "used_default_branch": true
}
```

**Required fields:**
- `type` (always "git_blob" or "git_tree")
- `url` (full GitHub URL)
- `ref` (branch or commit SHA)
- `path` (file path)

**Optional but recommended:**
- `blob_sha` (for verification)
- `line_range` (if specific lines)
- `raw_content_snippet` (exact content)
- `used_default_branch` (if ref was auto-selected)

---

## Coaching Labels Guide

| Label | When to Use | Example |
|-------|-------------|---------|
| **SUGGESTION** | Actionable advice backed by source | "Add error handling at line 45 following pattern in lines 120-135" |
| **INFERENCE** | Logical conclusion from code | "Based on lines 45-60, this uses password hashing for security" |
| **HYPOTHESIS** | Educated guess requiring verification | "This might be a race condition. Verify by: [steps]" |

**Important**: Every labeled item must include source references.

---

## Timestamp Format

**Required format**: `YYYY-MM-DDTHH:MM:SSZ`

**Examples:**
- ✅ `2025-10-26T02:39:19Z`
- ✅ `2025-12-31T23:59:59Z`
- ❌ `2025-10-26 02:39:19` (missing T and Z)
- ❌ `2025-10-26T02:39:19+00:00` (use Z, not +00:00)
- ❌ `2025-10-26T02:39:19.123Z` (no milliseconds)

---

## NOT_AVAILABLE Usage

**Correct:**
```json
{
  "data": {
    "file_content": "const x = 1;",
    "author": "NOT_AVAILABLE",
    "last_modified": "NOT_AVAILABLE"
  }
}
```

**Incorrect:**
```json
{
  "data": {
    "file_content": "const x = 1;",
    "author": null,
    "last_modified": ""
  }
}
```

**Rule**: Always use the string `"NOT_AVAILABLE"`, never `null`, `undefined`, or empty string.

---

## Parallelization Guide

**Run in Parallel:**
- Step 2 (Extraction): One call per candidate
- Step 3 (Verification): One call per candidate

**Run Sequentially:**
- Step 1 (Retrieval): Depends on user input
- Step 4 (Composition): Depends on verified results
- Step 5 (Auditing): Final validation step

**Why?**
- Parallel: Independent operations, no dependencies
- Sequential: Depends on previous step's output

---

## Caching Strategy

**What to cache:**
- RetrieverModel results (60 seconds TTL)
- ExtractorModel results (60 seconds TTL)

**What NOT to cache:**
- VerifierModel results (always fetch fresh)
- ComposerModel results (always build fresh)
- AuditorModel results (always validate fresh)

**Cache Key Format:**
```
{repo}:{ref}:{path}:{line_range}
```

**Example:**
```
MIHAchoppa/lvl-up-agency:main:backend/server.py:45-60
```

---

## Rate Limiting

**GitHub API Limits:**
- **Authenticated**: 5,000 requests/hour
- **Unauthenticated**: 60 requests/hour

**Best Practices:**
- Use authenticated requests (include GITHUB_TOKEN)
- Check rate limit before batch operations
- Implement exponential backoff on rate limit errors
- Cache aggressively (but verify independently)

**Check Rate Limit:**
```bash
curl -H "Authorization: token YOUR_TOKEN" \
  https://api.github.com/rate_limit
```

---

## Testing Checklist

Before deploying:

- [ ] Test file retrieval (success case)
- [ ] Test file not found (error case)
- [ ] Test verification mismatch (edge case)
- [ ] Test rate limit handling
- [ ] Test default branch usage
- [ ] Test coaching without synthesis
- [ ] Test coaching with synthesis
- [ ] Validate all responses against Global Output Schema
- [ ] Check timestamp format in all responses
- [ ] Verify source URLs are complete and accessible
- [ ] Confirm NOT_AVAILABLE usage is correct

---

## Performance Targets

| Operation | Target Time | Max Time |
|-----------|-------------|----------|
| Single file (Admin) | < 2s | 5s |
| Multiple files (Admin) | < 3s | 10s |
| Coach raw data | < 2.5s | 5s |
| Coach with coaching | < 5s | 15s |

**If exceeding targets:**
1. Enable parallel execution
2. Add caching
3. Optimize model selection
4. Use semantic-code-search for faster retrieval

---

## Model Selection Quick Guide

**Budget-Conscious:**
- Retriever: GPT-3.5-Turbo
- Extractor: GitHub API
- Verifier: GitHub API
- Composer: GPT-3.5-Turbo
- Auditor: Custom script
- **Cost per request**: ~$0.01-0.05

**High-Quality:**
- Retriever: GPT-4-Turbo
- Extractor: GitHub API
- Verifier: GitHub API
- Composer: GPT-4
- Auditor: GPT-4
- **Cost per request**: ~$0.10-0.30

**Recommended (Hybrid):**
- Retriever: semantic-code-search + GPT-4 fallback
- Extractor: GitHub API
- Verifier: GitHub API
- Composer: GPT-4
- Auditor: Custom script + GPT-3.5 for edge cases
- **Cost per request**: ~$0.02-0.10

---

## Integration Patterns

### Pattern 1: REST API
```javascript
app.post('/api/orchestrate', async (req, res) => {
  const { role, action, query, repo, ref } = req.body;
  
  let response;
  if (role === 'admin') {
    response = await orchestrateAdmin(query, repo, ref);
  } else if (role === 'coach') {
    response = await orchestrateCoach(query, repo, ref, req.body.include_coaching);
  }
  
  res.json(response);
});
```

### Pattern 2: CLI Tool
```bash
./orchestrate --role admin --action get_file --repo MIHAchoppa/lvl-up-agency --path backend/server.py
```

### Pattern 3: Library
```python
from ai_orchestration import Admin, Coach

admin = Admin(github_token="...")
response = admin.get_file("MIHAchoppa/lvl-up-agency", "backend/server.py")
print(response)
```

---

## Troubleshooting

| Issue | Likely Cause | Solution |
|-------|--------------|----------|
| "All verifications failed" | VerifierModel using cached data | Ensure independent fetch |
| "Missing source URLs" | ComposerModel not populating sources | Check prompt template |
| "Slow responses" | Sequential execution | Enable parallelization |
| "Rate limit errors" | Too many GitHub API calls | Add caching, use auth token |
| "Audit failures" | Invalid timestamp or schema | Check Global Output Schema compliance |
| "No matches found" | Query too specific or file moved | Broaden query, check path |

---

## File Structure Quick Reference

```
docs/ai-orchestration/
├── README.md                           # This file
├── GUARDRAILS.md                       # Hard guardrails (all roles)
├── AI_ADMIN_ORCHESTRATION.md           # AI Admin role details
├── AI_COACH_ORCHESTRATION.md           # AI Coach role details
├── COORDINATOR_RUNBOOK.md              # Implementation guide
├── schemas/
│   └── global-output-schema.json       # JSON schema definition
├── prompts/
│   └── COMPONENT_PROMPTS.md            # Copy-paste prompt templates
└── examples/
    └── EXAMPLE_PAYLOADS.md             # Ready-to-use examples
```

---

## Getting Started (5 Minutes)

1. **Choose your models** (see Model Selection)
2. **Copy a prompt template** (from COMPONENT_PROMPTS.md)
3. **Test with Example 1** (from EXAMPLE_PAYLOADS.md)
4. **Validate response** (against global-output-schema.json)
5. **Iterate and optimize**

---

## Next Steps

- [ ] Read GUARDRAILS.md for security rules
- [ ] Review AI_ADMIN_ORCHESTRATION.md for retrieval details
- [ ] Review AI_COACH_ORCHESTRATION.md for coaching details
- [ ] Study COMPONENT_PROMPTS.md for implementation
- [ ] Follow COORDINATOR_RUNBOOK.md for setup
- [ ] Test with EXAMPLE_PAYLOADS.md
- [ ] Deploy and monitor

---

## Support

For questions or issues:
1. Check COORDINATOR_RUNBOOK.md troubleshooting section
2. Review example payloads in EXAMPLE_PAYLOADS.md
3. Validate against global-output-schema.json
4. Ensure guardrails in GUARDRAILS.md are followed

---

**Remember**: The core principle is **verifiable data only**. Never invent, always retrieve and verify.
