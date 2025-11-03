/**
 * Agent 1: Scanner & Loader - Main Scanner
 *
 * IMPLEMENTATION_PLAN_PHASE2.md §2, Step 1.3
 *
 * Responsible for:
 * - File discovery using glob patterns
 * - File classification (code/test/config/contract)
 * - Respecting ignore rules
 * - Producing deterministic FileIndex
 * - Integrating monorepo detection
 *
 * Dependencies:
 * - glob package
 * - ./ignore-rules.ts (IgnoreRules)
 * - ./monorepo.ts (detectMonorepo, buildPackageMap)
 * - FileIndex, FileEntry from ../types/index.js
 *
 * TDD Approach:
 * 1. Write tests in tests/unit/scanner/scanner.test.ts first
 * 2. Implement Scanner class with scan() method
 * 3. Ensure deterministic ordering (sort by path)
 * 4. Target: ≥80% branch coverage
 *
 * Key interfaces:
 * - Scanner class: Main scanner with scan() method
 * - scan(): Returns FileIndex with entries, packages, rootPath
 */

// TODO: Implement Scanner class
// See IMPLEMENTATION_PLAN_PHASE2.md lines 542-646 for full implementation
