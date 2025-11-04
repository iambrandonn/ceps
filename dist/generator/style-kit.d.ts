/**
 * Agent 3: Spec Generator - Style Kit
 *
 * CTS-03 §4 (Style Kit)
 *
 * Responsible for:
 * - Defining canonical lexicon (validates, retrieves, persists, etc.)
 * - Voice/tense guidelines (present, active, behavior-first)
 * - Formatting rules (headings, bullets, code blocks)
 * - Consistency enforcement
 *
 * Dependencies: None
 *
 * TDD Approach:
 * 1. Export constants for lexicon, formatting rules
 * 2. Provide helper functions for style validation (Phase 4)
 *
 * Key exports:
 * - LEXICON: Canonical terms for behaviors
 * - STYLE_GUIDE: Voice, tense, formatting rules
 */
export declare const LEXICON: {
    validate: string;
    retrieve: string;
    fetch: string;
    persist: string;
    save: string;
    modify: string;
    update: string;
    remove: string;
    delete: string;
    compute: string;
    transform: string;
    emit: string;
    authorize: string;
    schedule: string;
    retry: string;
    cache: string;
};
export declare const STYLE_GUIDE: {
    voice: string;
    tense: string;
    approach: string;
    format: {
        headings: string;
        bullets: string;
        code: string;
    };
};
//# sourceMappingURL=style-kit.d.ts.map