# AI Orchestration System - Compound-Model Architecture

## Overview

This directory contains comprehensive documentation for implementing a **compound-model orchestration system** with two specialized AI roles:

- **AI Admin**: Authoritative retriever for raw repository artifacts, metadata, and exact lines of code
- **AI Coach**: Developer support with exact citations, coaching steps, and implementation guidance

Both roles enforce strict guardrails to ensure all responses are **factual, verifiable, and never fabricated**.

## Key Principles

1. **Never invent or simulate data** - If data cannot be retrieved, return `NOT_AVAILABLE`
2. **Every factual statement must include a source** - URL or git blob reference required
3. **Return verbatim file contents** - No paraphrasing, include comments and whitespace
4. **Timestamp all outputs** - UTC ISO8601 format
5. **No free-text narrative outside schema** - Structured JSON responses only

## Repository Context

- **Repository**: MIHAchoppa/lvl-up-agency
- **Languages**: 49.2% JavaScript, 47.7% Python, 1.4% CSS, 1.1% HTML, 0.6% Shell
- **Purpose**: BIGO Live Host Management Platform with AI-powered coaching and recruitment

## Documentation Structure

### Core Documentation

#### 📋 [GUARDRAILS.md](./GUARDRAILS.md)
Hard guardrails that apply to **every component model**. Essential reading before implementation.

**Contents**:
- Core guardrails (never invent data, require sources, verbatim content, etc.)
- Common failure patterns
- Role-specific guardrails
- AuditorModel enforcement rules
- Security considerations
- Quick do/don't reference

**Start here** to understand the fundamental rules.

---

#### 🔧 [AI_ADMIN_ORCHESTRATION.md](./AI_ADMIN_ORCHESTRATION.md)
Complete specification for the AI Admin role - authoritative data retrieval.

**Contents**:
- Purpose and core principle
- Compound-model orchestration pattern
- Component models (Retriever, Extractor, Verifier, Composer, Auditor)
- Coordinator instructions (step-by-step)
- Request/response examples
- Semantic code search integration
- Failure handling
- Performance optimization

**Use when**: You need exact file contents, commit info, or raw repository data.

---

#### 🎓 [AI_COACH_ORCHESTRATION.md](./AI_COACH_ORCHESTRATION.md)
Complete specification for the AI Coach role - developer support with coaching.

**Contents**:
- Purpose and core principle (raw data first, coaching second)
- Compound-model orchestration pattern
- Additional components (CoachExtractor, SynthesisModel)
- Coordinator instructions
- Request/response examples with coaching
- Coach-specific guardrails (labeled suggestions, source references)
- Debugging assistance examples

**Use when**: You need code explanations, implementation guidance, or learning support.

---

### Implementation Guides

#### 📚 [COORDINATOR_RUNBOOK.md](./COORDINATOR_RUNBOOK.md)
Step-by-step implementation guide for building the orchestration system.

**Contents**:
- Quick start (30-60 minutes to first response)
- Coordinator behavior and execution flow
- Implementation patterns (sequential, parallel, with caching)
- Model selection guide
- GitHub API integration
- Semantic code search integration
- Error handling patterns
- Testing strategies
- Performance benchmarks
- Security checklist

**Use when**: You're ready to implement the orchestration system.

---

#### 📝 [prompts/COMPONENT_PROMPTS.md](./prompts/COMPONENT_PROMPTS.md)
Copy-pasteable prompt templates for all component models.

**Contents**:
- RetrieverModel prompt
- ExtractorModel prompt
- VerifierModel prompt
- ComposerModel prompt
- AuditorModel prompt
- CoachExtractorModel prompt
- SynthesisModel prompt (restricted)
- Usage instructions and examples

**Use when**: You need exact prompts to send to your models.

---

### Examples and Reference

#### 💡 [examples/EXAMPLE_PAYLOADS.md](./examples/EXAMPLE_PAYLOADS.md)
Ready-to-use coordinator payloads for common scenarios.

**Contents**:
- AI Admin examples (get file, get lines, file not found)
- AI Coach examples (find implementation, with coaching guidance)
- Semantic code search integration
- Step-by-step coordinator calls with expected responses
- Copy-paste request templates

**Use when**: You want to see complete end-to-end examples.

---

#### ⚡ [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
Quick reference guide for implementation and troubleshooting.

**Contents**:
- Quick do/don't guide
- Component model comparison table
- Response status guide
- Common error patterns
- Execution order cheat sheet
- Source object template
- Coaching labels guide
- Timestamp format rules
- Caching strategy
- Testing checklist
- Troubleshooting table

**Use when**: You need quick answers during implementation.

---

#### 📊 [schemas/global-output-schema.json](./schemas/global-output-schema.json)
JSON Schema definition for the Global Output Schema.

**Contents**:
- Complete schema specification
- Required fields
- Field types and formats
- Validation rules
- Example responses (success, not_available, error)

**Use when**: You need to validate responses programmatically.

---

## Quick Start Guide

### For First-Time Users

**5-Minute Quick Start**:

1. **Read** [GUARDRAILS.md](./GUARDRAILS.md) (5 min)
2. **Choose** your use case:
   - Need raw data? → [AI_ADMIN_ORCHESTRATION.md](./AI_ADMIN_ORCHESTRATION.md)
   - Need coaching? → [AI_COACH_ORCHESTRATION.md](./AI_COACH_ORCHESTRATION.md)
3. **Copy** a prompt from [prompts/COMPONENT_PROMPTS.md](./prompts/COMPONENT_PROMPTS.md)
4. **Test** with [examples/EXAMPLE_PAYLOADS.md](./examples/EXAMPLE_PAYLOADS.md)
5. **Reference** [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) as needed

**30-Minute Implementation**:

1. Read [GUARDRAILS.md](./GUARDRAILS.md)
2. Choose AI Admin or AI Coach role
3. Follow [COORDINATOR_RUNBOOK.md](./COORDINATOR_RUNBOOK.md) - Simple Sequential pattern
4. Use prompts from [COMPONENT_PROMPTS.md](./prompts/COMPONENT_PROMPTS.md)
5. Test with examples from [EXAMPLE_PAYLOADS.md](./examples/EXAMPLE_PAYLOADS.md)
6. Validate against [global-output-schema.json](./schemas/global-output-schema.json)

**Production Setup** (2-4 hours):

1. Complete 30-minute implementation
2. Follow [COORDINATOR_RUNBOOK.md](./COORDINATOR_RUNBOOK.md) - Parallel Execution pattern
3. Implement caching (see runbook)
4. Add GitHub API integration
5. Configure semantic-code-search (optional)
6. Complete security checklist
7. Run all tests
8. Deploy and monitor

---

## Architecture Overview

### Compound-Model Pipeline

```
┌─────────────────┐
│  User Request   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 1: RetrieverModel                 │
│  Find candidate files/blob URLs         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 2: ExtractorModel (Parallel)      │
│  Fetch verbatim content                 │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 3: VerifierModel (Parallel)       │
│  Independent confirmation               │
└────────┬────────────────────────────────┘
         │
         ▼ (Coach only, if requested)
┌─────────────────────────────────────────┐
│  Step 3.5: SynthesisModel               │
│  Generate labeled coaching              │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 4: ComposerModel                  │
│  Build Global Output Schema             │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 5: AuditorModel                   │
│  Validate guardrails & schema           │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Final Response │
└─────────────────┘
```

### Component Models

| Component | Purpose | Input | Output |
|-----------|---------|-------|--------|
| **RetrieverModel** | Find candidates | User query, repo, path, ref | Blob URLs + line ranges |
| **ExtractorModel** | Fetch content | Blob URL, line range | Verbatim content + metadata |
| **VerifierModel** | Confirm accuracy | Blob URL, expected content | Match status + confirmed content |
| **ComposerModel** | Build response | Verified entries, requested fields | Global Output Schema JSON |
| **AuditorModel** | Validate | Composed response | Pass/fail + validated response |
| **CoachExtractorModel** | Coach-aware extract | Blob URL, coaching question | Verbatim content + relevance |
| **SynthesisModel** | Generate coaching | Verified entries, question | Labeled suggestions + steps |

---

## Global Output Schema

All responses must follow this schema:

```json
{
  "status": "success" | "not_available" | "error",
  "fetched_at": "2025-10-26T02:39:19Z",
  "data": {
    "key": "value or NOT_AVAILABLE"
  },
  "sources": [{
    "type": "git_blob",
    "url": "https://github.com/owner/repo/blob/ref/path",
    "ref": "branch-or-commit",
    "path": "path/to/file",
    "blob_sha": "abc123...",
    "line_range": "10-25",
    "raw_content_snippet": "exact verbatim text",
    "used_default_branch": true
  }],
  "message": "Human-readable status"
}
```

See [schemas/global-output-schema.json](./schemas/global-output-schema.json) for complete specification.

---

## Use Cases

### AI Admin Use Cases

✅ Get exact file contents  
✅ Retrieve specific line ranges  
✅ Fetch commit metadata  
✅ List directory contents  
✅ Get git history for a file  
✅ Retrieve blob SHAs  
✅ Access raw repository data  

### AI Coach Use Cases

✅ Explain how code works  
✅ Find implementation examples  
✅ Debug issues with context  
✅ Learn best practices from actual code  
✅ Get implementation guidance  
✅ Understand code architecture  
✅ Receive step-by-step coding assistance  

---

## Security Considerations

**Read**: [GUARDRAILS.md](./GUARDRAILS.md) security section

Key points:
- ✅ Use read-only GitHub access
- ✅ Store credentials securely (environment variables)
- ✅ Handle rate limiting
- ✅ Return NOT_AVAILABLE for access-denied cases
- ✅ Never expose credentials in responses
- ✅ Validate all user inputs
- ✅ Implement timeout limits

---

## Testing

See [COORDINATOR_RUNBOOK.md](./COORDINATOR_RUNBOOK.md) testing section and [examples/EXAMPLE_PAYLOADS.md](./examples/EXAMPLE_PAYLOADS.md).

**Key test cases**:
- ✅ File retrieval (success)
- ✅ File not found (not_available)
- ✅ Access denied (not_available)
- ✅ Verification mismatch (error)
- ✅ Rate limit exceeded (error)
- ✅ Default branch usage
- ✅ Coach without coaching
- ✅ Coach with coaching
- ✅ Schema validation

---

## Performance

**Expected response times** (with parallel execution):

| Operation | Target | Max |
|-----------|--------|-----|
| Single file (Admin) | < 2s | 5s |
| Multiple files (Admin) | < 3s | 10s |
| Coach raw data | < 2.5s | 5s |
| Coach with coaching | < 5s | 15s |

**Optimization tips**:
- Enable parallel execution for extraction + verification
- Implement caching (60s TTL)
- Use semantic-code-search for faster retrieval
- Choose appropriate models (see runbook)

---

## Model Selection

See [COORDINATOR_RUNBOOK.md](./COORDINATOR_RUNBOOK.md) model selection section.

**Recommended stack**:
- RetrieverModel: semantic-code-search + GPT-4-Turbo fallback
- ExtractorModel: GitHub API
- VerifierModel: GitHub API
- ComposerModel: GPT-4
- AuditorModel: Custom validator + GPT-3.5-Turbo
- CoachExtractorModel: GPT-4-Turbo
- SynthesisModel: GPT-4 or Claude-3-Opus

**Cost per request**: ~$0.02-0.10 (hybrid stack)

---

## Integration

### REST API Example

```javascript
app.post('/api/orchestrate', async (req, res) => {
  const { role, action, query, repo, ref } = req.body;
  
  const orchestrator = role === 'admin' 
    ? new AdminOrchestrator() 
    : new CoachOrchestrator();
  
  const response = await orchestrator.execute({
    query, repo, ref
  });
  
  res.json(response);
});
```

### CLI Example

```bash
./orchestrate \
  --role admin \
  --action get_file \
  --repo MIHAchoppa/lvl-up-agency \
  --path backend/server.py
```

### Python Library Example

```python
from ai_orchestration import Admin

admin = Admin(github_token="...")
response = admin.get_file(
    repo="MIHAchoppa/lvl-up-agency",
    path="backend/server.py",
    ref="main"
)
print(response)
```

---

## Troubleshooting

See [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) troubleshooting section.

**Common issues**:
- All verifications failed → Check VerifierModel uses independent fetch
- Missing source URLs → Check ComposerModel prompt
- Slow responses → Enable parallelization
- Rate limit errors → Add caching, use auth token
- Audit failures → Validate against Global Output Schema

---

## Contributing

When adding or modifying orchestration logic:

1. ✅ Follow all guardrails in [GUARDRAILS.md](./GUARDRAILS.md)
2. ✅ Update relevant documentation
3. ✅ Add examples to [EXAMPLE_PAYLOADS.md](./examples/EXAMPLE_PAYLOADS.md)
4. ✅ Test against [global-output-schema.json](./schemas/global-output-schema.json)
5. ✅ Update [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) if needed

---

## Next Steps

**Choose your path**:

### Path 1: I want to understand the system
→ Read [GUARDRAILS.md](./GUARDRAILS.md)  
→ Read [AI_ADMIN_ORCHESTRATION.md](./AI_ADMIN_ORCHESTRATION.md)  
→ Read [AI_COACH_ORCHESTRATION.md](./AI_COACH_ORCHESTRATION.md)  
→ Review [examples/EXAMPLE_PAYLOADS.md](./examples/EXAMPLE_PAYLOADS.md)  

### Path 2: I want to implement it now
→ Skim [GUARDRAILS.md](./GUARDRAILS.md) (know the rules)  
→ Follow [COORDINATOR_RUNBOOK.md](./COORDINATOR_RUNBOOK.md)  
→ Copy prompts from [COMPONENT_PROMPTS.md](./prompts/COMPONENT_PROMPTS.md)  
→ Test with [EXAMPLE_PAYLOADS.md](./examples/EXAMPLE_PAYLOADS.md)  
→ Reference [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) as needed  

### Path 3: I just need quick answers
→ Use [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)  
→ Check [examples/EXAMPLE_PAYLOADS.md](./examples/EXAMPLE_PAYLOADS.md) for examples  
→ Validate with [schemas/global-output-schema.json](./schemas/global-output-schema.json)  

---

## Support

For questions:
1. Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) troubleshooting
2. Review [COORDINATOR_RUNBOOK.md](./COORDINATOR_RUNBOOK.md) for implementation details
3. Validate responses against [schemas/global-output-schema.json](./schemas/global-output-schema.json)
4. Ensure all [GUARDRAILS.md](./GUARDRAILS.md) rules are followed

---

## Version

**Current Version**: 1.0  
**Last Updated**: 2025-10-26  
**Repository**: MIHAchoppa/lvl-up-agency  

---

**Core Principle**: The orchestration system ensures that all AI responses are **verifiable, factual, and never fabricated**. When in doubt, return NOT_AVAILABLE rather than guessing.
