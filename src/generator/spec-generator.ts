/**
 * Agent 3: Spec Generator - Main Generator
 *
 * IMPLEMENTATION_PLAN_PHASE2.md §2, Steps 3.2-3.3
 *
 * Responsible for:
 * - Generating root spec.md (overview, conventions, index)
 * - Generating per-directory spec.md files
 * - Handling monorepo packages (per-package specs)
 * - Grouping entities by file and directory
 * - Including style kit conventions
 *
 * IMPORTANT (v1.2): Constructor signature is:
 *   constructor(kb: KnowledgeBase, fileIndex?: FileIndex)
 *
 * Dependencies:
 * - ./markdown-renderer.ts (MarkdownRenderer)
 * - ../kb/knowledge-base.js (KnowledgeBase)
 * - FileIndex from ../types/index.js
 * - Entity from ../kb/models.js
 *
 * TDD Approach:
 * 1. Write tests in tests/unit/generator/spec-generator.test.ts first
 * 2. Implement SpecGenerator class
 * 3. Implement generateRootSpec() method
 * 4. Implement generateDirectorySpecs() method
 * 5. Add monorepo support (package-level specs)
 * 6. Target: ≥80% branch coverage
 *
 * Key interfaces:
 * - SpecGenerator class: Main generator
 * - generateRootSpec(): Returns root spec.md content
 * - generateDirectorySpecs(): Returns Record<path, markdown>
 */

// TODO: Implement SpecGenerator class
// See IMPLEMENTATION_PLAN_PHASE2.md lines 1710-2000 for full implementation
// IMPORTANT: Constructor takes (kb, fileIndex?) - see Section 3.3.2
