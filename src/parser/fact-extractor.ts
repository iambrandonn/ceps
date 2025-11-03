/**
 * Agent 2: Parser & Patterns - Fact Extractor
 *
 * IMPLEMENTATION_PLAN_PHASE2.md §2, Step 2.2
 *
 * Responsible for:
 * - Extracting entities (functions, classes, methods, constants)
 * - Extracting relations (imports, exports, calls)
 * - Extracting facts (signatures, JSDoc, side effects)
 * - Detecting side effects (I/O, network, DB, storage)
 * - Creating factSets with provenance
 *
 * CRITICAL: Call relation extraction must happen INSIDE function/method loops
 * to avoid duplicate anchor generation (see v1.3 fixes in plan)
 *
 * Dependencies:
 * - ts-morph (SourceFile, Node, CallExpression, etc.)
 * - ../kb/id-generation.js (generateAnchor)
 * - Entity, Relation, FactSet, Fact from ../kb/models.js
 *
 * TDD Approach:
 * 1. Write tests in tests/unit/parser/fact-extractor.test.ts first
 * 2. Implement FactExtractor class with extract() method
 * 3. Test extraction for functions, classes, methods, imports, exports, calls
 * 4. Test side effect detection
 * 5. Test JSDoc extraction
 * 6. Target: ≥80% branch coverage
 *
 * Key interfaces:
 * - ExtractionResult: { entities, relations, factSets }
 * - FactExtractor class: Main extractor with extract() method
 */

// TODO: Implement FactExtractor class
// See IMPLEMENTATION_PLAN_PHASE2.md lines 980-1194 for full implementation
// IMPORTANT: Review v1.3 fixes (lines 1006-1064, 1072-1120) for correct anchor generation
