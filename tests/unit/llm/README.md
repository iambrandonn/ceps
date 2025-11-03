# LLM Gateway Unit Tests

**Agent 4** should create tests here following TDD.

## Required Test Files

1. `gateway.test.ts` - Test provider switching, caching, budget enforcement
2. `adapters/anthropic.test.ts` - Test Anthropic API integration
3. `adapters/openai.test.ts` - Test OpenAI API integration
4. `cache.test.ts` - Test cache key generation, hit/miss, invalidation
5. `budget.test.ts` - Test token counting, budget tracking, reporting

## Coverage Target

≥80% branch coverage for all LLM modules

## See Also

- IMPLEMENTATION_PLAN_PHASE2.md §2, Agent 4 for overview
- CTS-02 for LLM Gateway specification
