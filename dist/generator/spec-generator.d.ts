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
 * IMPORTANT: Constructor signature is:
 *   constructor(kb: KnowledgeBase, fileIndex?: FileIndex)
 */
import { KnowledgeBase } from '../kb/knowledge-base.js';
import { FileIndex } from '../types/index.js';
export declare class SpecGenerator {
    private kb;
    private renderer;
    private fileIndex?;
    constructor(kb: KnowledgeBase, fileIndex?: FileIndex);
    /**
     * Generate root spec.md content
     */
    generateRootSpec(projectRoot: string): string;
    /**
     * Generate per-directory or per-package spec.md files
     * Returns a map of file paths to markdown content
     */
    generateDirectorySpecs(projectRoot: string): Record<string, string>;
    /**
     * Get list of directories containing exported entities
     */
    private getDirectories;
    /**
     * Group entities by file path
     */
    private groupByFile;
}
//# sourceMappingURL=spec-generator.d.ts.map