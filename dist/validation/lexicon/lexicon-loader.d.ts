/**
 * Phase 4 WS-F1 Stage D: Lexicon Normalization
 *
 * Normalizes terminology to canonical verbs for consistent behavior descriptions.
 * Implements SADS §7.3 lexicon requirements.
 *
 * Canonical verbs: validate, compute, transform, emit, persist, fetch, authorize,
 * schedule, retry, cache, map, filter, aggregate, normalize, publish, subscribe,
 * configure, monitor, guard, route, parse
 */
/**
 * LexiconLoader manages terminology normalization.
 * Caches loaded lexicon for performance.
 */
export declare class LexiconLoader {
    private lexicon;
    private synonymMap;
    /**
     * Load lexicon from JSON file.
     *
     * @param path - Path to lexicon JSON file
     * @throws Error if file is malformed or cannot be read
     */
    load(path: string): void;
    /**
     * Build reverse map: synonym → canonical verb.
     * Includes canonical verbs themselves as valid terms.
     */
    private buildSynonymMap;
    /**
     * Normalize a term to its canonical verb.
     * Case-insensitive lookup.
     *
     * @param term - Term to normalize
     * @returns Canonical verb, or original term if not in lexicon
     */
    normalize(term: string): string;
    /**
     * Get all canonical verbs in lexicon.
     *
     * @returns Array of canonical verbs
     */
    getCanonicals(): string[];
    /**
     * Check if lexicon is loaded.
     *
     * @returns True if lexicon is loaded
     */
    isLoaded(): boolean;
}
/**
 * Normalize a term using default lexicon.
 * Convenience function for one-off normalizations.
 *
 * @param term - Term to normalize
 * @returns Canonical verb, or original term if not in lexicon
 */
export declare function normalizeTerm(term: string): string;
//# sourceMappingURL=lexicon-loader.d.ts.map