/**
 * Agent 1: Scanner & Loader - Ignore Rules Engine
 *
 * IMPLEMENTATION_PLAN_PHASE2.md §2, Step 1.1
 *
 * Responsible for:
 * - Implementing ignore precedence (defaults → .gitignore → explicit)
 * - Pattern matching for node_modules, dist, build, minified files
 * - Support for explicit overrides (negation patterns)
 *
 * Dependencies:
 * - ignore package (npm install ignore)
 * - FileEntry type from ../types/index.js
 *
 * TDD Approach:
 * 1. Write tests in tests/unit/scanner/ignore-rules.test.ts first
 * 2. Implement IgnoreRules class to make tests pass
 * 3. Target: ≥80% branch coverage
 *
 * Key interfaces:
 * - IgnoreRulesOptions: Configuration for ignore behavior
 * - IgnoreRules class: Main engine with shouldIgnore() method
 */

// TODO: Implement IgnoreRules class
// See IMPLEMENTATION_PLAN_PHASE2.md lines 264-329 for full implementation
