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
export const LEXICON = {
    // Actions
    validate: 'validates',
    retrieve: 'retrieves',
    fetch: 'fetches',
    persist: 'persists',
    save: 'saves',
    modify: 'modifies',
    update: 'updates',
    remove: 'removes',
    delete: 'deletes',
    compute: 'computes',
    transform: 'transforms',
    emit: 'emits',
    authorize: 'authorizes',
    schedule: 'schedules',
    retry: 'retries',
    cache: 'caches',
};
export const STYLE_GUIDE = {
    voice: 'active',
    tense: 'present',
    approach: 'behavior-first', // Intent & outcomes, not algorithms
    format: {
        headings: '## for files, ### for entities',
        bullets: 'Multi-step behavior as bullet lists',
        code: 'Minimal code snippets, signatures only',
    },
};
// TODO: Add style validation helpers in Phase 4
//# sourceMappingURL=style-kit.js.map