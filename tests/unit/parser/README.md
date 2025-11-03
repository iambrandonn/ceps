# Parser Unit Tests

**Agent 2** should create tests here following TDD.

## Required Test Files

1. `parser.test.ts` - Test TS/JS/JSX/TSX parsing, Babel fallback, error handling
2. `fact-extractor.test.ts` - Test entity/relation/fact extraction, side effects, JSDoc
3. `pattern-detector.test.ts` - Test dynamic pattern detection (eval, Proxy, dynamic imports)
4. `aux-readers/test-reader.test.ts` - Test test case extraction
5. `aux-readers/config-reader.test.ts` - Test config fact extraction (basic)

## Coverage Target

≥80% branch coverage for all parser modules

## See Also

- IMPLEMENTATION_PLAN_PHASE2.md §2, Steps 2.1-2.4 for test cases
- CTS-05 §3-5 for Parser specification
