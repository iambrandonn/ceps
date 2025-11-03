/**
 * Agent 4: LLM Gateway - Main Gateway
 *
 * IMPLEMENTATION_PLAN_PHASE2.md §2, Agent 4
 * CTS-02 (LLM Gateway)
 *
 * Responsible for:
 * - Provider-agnostic LLM interface
 * - Adapter management (Anthropic, OpenAI, Azure, local)
 * - Caching and budget tracking
 * - Prompt formatting
 *
 * NOTE: Phase 2 is skeleton only (no grounding validator yet)
 * Grounding Validator will be added in Phase 4
 *
 * Dependencies:
 * - ./adapters/*.ts (provider adapters)
 * - ./cache.ts (caching infrastructure)
 * - ./budget.ts (budget tracking)
 *
 * TDD Approach:
 * 1. Write tests in tests/unit/llm/gateway.test.ts first
 * 2. Implement LLMGateway class with completions() method
 * 3. Test adapter switching, caching, budget enforcement
 * 4. Target: ≥80% branch coverage
 *
 * Key interfaces:
 * - LLMGateway class: Main gateway
 * - completions(): Send prompt and get response
 * - setProvider(): Switch between providers
 */

// TODO: Implement LLMGateway class
// See CTS-02 for full specification
// Phase 2: Skeleton only (adapters, cache, budget)
// Phase 4: Add Grounding Validator integration
