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
import { readFileSync } from 'fs';
import { resolve } from 'path';
/**
 * LexiconLoader manages terminology normalization.
 * Caches loaded lexicon for performance.
 */
export class LexiconLoader {
    lexicon = null;
    synonymMap = new Map();
    /**
     * Load lexicon from JSON file.
     *
     * @param path - Path to lexicon JSON file
     * @throws Error if file is malformed or cannot be read
     */
    load(path) {
        try {
            const content = readFileSync(path, 'utf-8');
            this.lexicon = JSON.parse(content);
            // Build reverse synonym map for fast lookup
            this.buildSynonymMap();
        }
        catch (error) {
            throw new Error(`Failed to load lexicon from ${path}: ${error.message}`);
        }
    }
    /**
     * Build reverse map: synonym → canonical verb.
     * Includes canonical verbs themselves as valid terms.
     */
    buildSynonymMap() {
        if (!this.lexicon)
            return;
        this.synonymMap.clear();
        for (const [canonical, synonyms] of Object.entries(this.lexicon)) {
            // Canonical verb maps to itself
            this.synonymMap.set(canonical.toLowerCase(), canonical);
            // Each synonym maps to canonical
            for (const synonym of synonyms) {
                this.synonymMap.set(synonym.toLowerCase(), canonical);
            }
        }
    }
    /**
     * Normalize a term to its canonical verb.
     * Case-insensitive lookup.
     *
     * @param term - Term to normalize
     * @returns Canonical verb, or original term if not in lexicon
     */
    normalize(term) {
        const canonical = this.synonymMap.get(term.toLowerCase());
        return canonical || term;
    }
    /**
     * Get all canonical verbs in lexicon.
     *
     * @returns Array of canonical verbs
     */
    getCanonicals() {
        return this.lexicon ? Object.keys(this.lexicon) : [];
    }
    /**
     * Check if lexicon is loaded.
     *
     * @returns True if lexicon is loaded
     */
    isLoaded() {
        return this.lexicon !== null;
    }
}
// Singleton instance for convenience
let defaultLoader = null;
/**
 * Get or create default lexicon loader.
 * Uses default lexicon path: src/validation/lexicon/ceps.lexicon.json
 *
 * @returns Default lexicon loader instance
 */
function getDefaultLoader() {
    if (!defaultLoader) {
        defaultLoader = new LexiconLoader();
        const defaultPath = resolve(__dirname, './ceps.lexicon.json');
        defaultLoader.load(defaultPath);
    }
    return defaultLoader;
}
/**
 * Normalize a term using default lexicon.
 * Convenience function for one-off normalizations.
 *
 * @param term - Term to normalize
 * @returns Canonical verb, or original term if not in lexicon
 */
export function normalizeTerm(term) {
    const loader = getDefaultLoader();
    return loader.normalize(term);
}
//# sourceMappingURL=lexicon-loader.js.map