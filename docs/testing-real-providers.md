# Testing with Real LLM Providers

**Status:** Optional / Manual Validation
**Audience:** Developers performing exploratory validation
**CI Status:** Excluded from automated gates (mock-based tests only)

---

## Overview

By default, all ceps tests use deterministic provider mocks to ensure:
- Reproducible test results across environments
- No API costs during development/CI
- Fast test execution
- No network dependencies

However, for exploratory validation or production readiness verification, you can optionally test against real LLM provider APIs.

---

## Prerequisites

### API Keys

You'll need valid API keys for the providers you want to test:

- **Anthropic:** `ANTHROPIC_API_KEY`
- **OpenAI:** `OPENAI_API_KEY`
- **Azure OpenAI:** `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`

### Cost Awareness

⚠️ **Real API calls incur costs:**

- Anthropic Claude 3.5 Sonnet: ~$3/1M input tokens, ~$15/1M output tokens
- OpenAI GPT-4: ~$30/1M input tokens, ~$60/1M output tokens

**Estimated test costs:**
- Express fixture (~30k tokens): $0.05 - $0.15
- React fixture (~40k tokens): $0.07 - $0.20
- Full integration suite: $0.20 - $0.50

---

## Usage

### Quick Test (Single Fixture)

Test with Anthropic Claude on Express fixture:

```bash
# Set API key
export ANTHROPIC_API_KEY=sk-ant-...

# Run generation with real LLM
npm run build
./dist/orchestrator/index.js tests/fixtures/tiny-express \
  --llm on \
  --llm-provider anthropic \
  --llm-budget 50000

# Check generated spec
cat tests/fixtures/tiny-express/spec.md
```

### Test with OpenAI

```bash
export OPENAI_API_KEY=sk-...

./dist/orchestrator/index.js tests/fixtures/tiny-express \
  --llm on \
  --llm-provider openai \
  --llm-model gpt-4 \
  --llm-budget 50000
```

### Test with Budget Constraints

Verify graceful fallback when budget exhausted:

```bash
export ANTHROPIC_API_KEY=sk-ant-...

# Very low budget to trigger fallback
./dist/orchestrator/index.js tests/fixtures/tiny-express \
  --llm on \
  --llm-provider anthropic \
  --llm-budget 1000

# Should see warnings about budget exhaustion and template fallback
```

---

## Manual Validation Checklist

### Scenario 1: Basic LLM Polish

**Goal:** Verify LLM polish improves spec quality

```bash
# Generate with template only
./dist/orchestrator/index.js tests/fixtures/tiny-express \
  --llm off \
  --output /tmp/template-spec.md

# Generate with LLM polish
export ANTHROPIC_API_KEY=sk-ant-...
./dist/orchestrator/index.js tests/fixtures/tiny-express \
  --llm on \
  --output /tmp/llm-spec.md

# Compare outputs
diff /tmp/template-spec.md /tmp/llm-spec.md
```

**Expected:**
- Structure preserved (same headings/anchors)
- LLM version has more natural prose
- Both have factSetId metadata
- Both pass validation gates

---

### Scenario 2: Deterministic Mode

**Goal:** Verify deterministic flag reduces variance

```bash
export ANTHROPIC_API_KEY=sk-ant-...

# Run 1
./dist/orchestrator/index.js tests/fixtures/tiny-express \
  --llm on \
  --deterministic \
  --output /tmp/run1-spec.md

# Run 2
./dist/orchestrator/index.js tests/fixtures/tiny-express \
  --llm on \
  --deterministic \
  --output /tmp/run2-spec.md

# Compare structural elements
diff /tmp/run1-spec.md /tmp/run2-spec.md
```

**Expected:**
- Headings/anchors identical
- FactSetIds preserved
- Minimal prose variance (deterministic sampling)

---

### Scenario 3: Budget Management

**Goal:** Verify cost gate compliance

```bash
export ANTHROPIC_API_KEY=sk-ant-...

# Express fixture (≤30k token threshold)
./dist/orchestrator/index.js tests/fixtures/tiny-express \
  --llm on \
  --llm-budget 30000

# Should complete successfully within budget
# Check run summary for token usage
```

**Expected:**
- Tokens used ≤30k
- Cost gate passes
- Exit code 0
- Run summary shows token breakdown

---

### Scenario 4: Validator Integration

**Goal:** Verify grounding validation works with real LLM

```bash
export ANTHROPIC_API_KEY=sk-ant-...

# Run with validation enabled
./dist/orchestrator/index.js tests/fixtures/tiny-express \
  --llm on \
  --llm-provider anthropic

# Monitor for retry cycles in logs
# Should see O → R1 → R2 transitions if validation rejects
```

**Expected:**
- Grounding validator checks LLM outputs
- Retries on validation failures
- Fallback to template if max retries exceeded
- No broken factSetId references

---

## Interpreting Results

### Success Indicators

✅ **Spec generated successfully**
- `spec.md` file created
- No crash/error exit codes

✅ **Budget respected**
- Token usage within specified limit
- Cost gate passes (if applicable)

✅ **Validation passes**
- Grounding gate passes
- No broken cross-links
- All chunks have factSetIds

✅ **Quality improvement**
- LLM-polished prose more readable than templates
- Technical accuracy preserved
- Anchors/structure intact

### Warning Signs

⚠️ **High template fallback rate**
- Many chunks falling back to templates
- Possible validator too strict
- Or budget exhaustion

⚠️ **Budget exceeded**
- Tokens used > budget limit
- Cost gate fails (exit code 2)
- Need to increase budget or reduce scope

⚠️ **Validation failures**
- Grounding gate fails (exit code 2)
- Chunks missing factSetIds
- Possible LLM hallucination

---

## Troubleshooting

### Issue: API Rate Limiting

**Symptoms:** HTTP 429 errors, slow responses

**Solution:**
```bash
# Add delay between chunks (not yet implemented)
# For now: reduce scope or use smaller fixtures
```

### Issue: High Costs

**Symptoms:** Unexpected API charges

**Solution:**
```bash
# Use smaller budget limits
./dist/orchestrator/index.js <project> \
  --llm on \
  --llm-budget 10000  # Lower limit

# Or test on smaller fixtures only
```

### Issue: Inconsistent Results

**Symptoms:** Different outputs across runs

**Solution:**
```bash
# Enable deterministic mode
./dist/orchestrator/index.js <project> \
  --llm on \
  --deterministic  # Reduces variance
```

---

## CI Exclusion Policy

**Why excluded from CI?**

1. **Cost:** Automated tests would incur significant API charges
2. **Reliability:** Network dependencies reduce CI stability
3. **Speed:** Real API calls slow down test suite
4. **Reproducibility:** LLM outputs vary, making assertions difficult

**Automated testing strategy:**
- CI uses deterministic mocks exclusively
- Real provider testing is manual/exploratory
- Production readiness verified via mock-backed integration tests

---

## Fixture Recommendations

### For Quick Validation

**Use:** `tests/fixtures/tiny-express`
- Small codebase (~5 entities)
- Fast execution (~30 seconds with LLM)
- Low cost (~$0.05 per run)

### For Comprehensive Testing

**Use:** `tests/fixtures/tiny-react`
- Moderate complexity (~10 entities)
- Component patterns (React-specific)
- Cost: ~$0.10 per run

### For Production Readiness

**Use:** Your own small project
- Real-world code patterns
- Validates actual usage
- Budget: Start with 50k tokens

---

## Reporting Issues

If real provider testing reveals bugs:

1. **Reproduce with mock:**
   - Try to recreate issue using MockValidator/MockGateway
   - Easier to debug and fix

2. **Document LLM behavior:**
   - Save LLM inputs/outputs
   - Note which prompts failed validation
   - Share factSets for debugging

3. **Check grounding:**
   - Verify factSetIds present in output
   - Ensure LLM didn't hallucinate facts
   - Compare against template output

---

## Advanced Usage

### Custom Provider Configuration

```bash
# Azure OpenAI
export AZURE_OPENAI_API_KEY=...
export AZURE_OPENAI_ENDPOINT=https://...

./dist/orchestrator/index.js <project> \
  --llm on \
  --llm-provider azure \
  --llm-model gpt-4

# Local provider (custom endpoint)
./dist/orchestrator/index.js <project> \
  --llm on \
  --llm-provider local \
  --llm-endpoint http://localhost:8080/v1
```

### Batch Testing Script

For testing multiple fixtures in sequence:

```bash
#!/bin/bash
# test-real-providers.sh

export ANTHROPIC_API_KEY=sk-ant-...

FIXTURES=(tiny-express tiny-react)

for fixture in "${FIXTURES[@]}"; do
  echo "Testing $fixture..."
  ./dist/orchestrator/index.js "tests/fixtures/$fixture" \
    --llm on \
    --llm-provider anthropic \
    --llm-budget 50000 \
    --output "/tmp/${fixture}-spec.md"

  if [ $? -eq 0 ]; then
    echo "✅ $fixture: SUCCESS"
  else
    echo "❌ $fixture: FAILED"
  fi
done
```

---

## See Also

- `IMPLEMENTATION_PLAN_PHASE4_WS_F2.md` - WS-F2 implementation plan
- `docs/cli.md` - CLI flag reference
- `docs/examples/run-summary.json` - Run summary schema
- `docs/process/grounding.md` - Grounding validation details

---

**Last updated:** 2025-11-05
**Status:** Complete
**Maintainer:** Phase 4 WS-F2
