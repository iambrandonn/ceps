/**
 * Agent 3: Spec Generator - Markdown Renderer
 *
 * IMPLEMENTATION_PLAN_PHASE2.md §2, Step 3.1
 *
 * Responsible for:
 * - Rendering entities as Markdown sections
 * - Including anchors for cross-linking
 * - Rendering side effects, errors, signatures
 * - Using style kit lexicon (active voice, present tense)
 * - Generating template prose (no LLM polish yet)
 */
export class MarkdownRenderer {
    /**
     * Renders an entity as a Markdown section
     * @param entity - Entity to render
     * @param chunks - Optional behavior chunks (if available)
     * @returns Markdown string
     */
    renderEntity(entity, chunks) {
        let md = '';
        // Anchor
        md += `<a id="${entity.id}"></a>\n\n`;
        // Heading (## for files, ### for other entities)
        const level = entity.kind === 'file' ? '##' : '###';
        md += `${level} ${entity.name}\n\n`;
        // Signature
        if (entity.signature) {
            md += `**Signature:** \`${entity.signature}\`\n\n`;
        }
        // Visibility
        if (entity.exported) {
            md += `**Visibility:** Public (exported)\n\n`;
        }
        // Behavior chunks (template-based for now)
        if (chunks && chunks.length > 0) {
            md += '**Behavior:**\n\n';
            for (const chunk of chunks) {
                md += `- ${chunk.textDraft}\n`;
            }
            md += '\n';
        }
        else {
            // Generate template prose
            md += this.generateTemplateProse(entity);
        }
        // Side effects
        if (entity.attributes?.sideEffects && entity.attributes.sideEffects.length > 0) {
            md += '**Side effects:**\n';
            for (const effect of entity.attributes.sideEffects) {
                md += `- ${effect}\n`;
            }
            md += '\n';
        }
        // Errors
        if (entity.attributes?.errors && entity.attributes.errors.length > 0) {
            md += '**Errors thrown:**\n';
            for (const error of entity.attributes.errors) {
                md += `- ${error}\n`;
            }
            md += '\n';
        }
        return md;
    }
    /**
     * Generate template prose from entity metadata
     * Uses heuristics based on entity name and kind
     */
    generateTemplateProse(entity) {
        switch (entity.kind) {
            case 'function':
                return `This function ${this.inferPurpose(entity.name)}.\n\n`;
            case 'class':
                return `This class represents ${this.humanizeName(entity.name)}.\n\n`;
            case 'method':
                return `This method ${this.inferPurpose(entity.name)}.\n\n`;
            case 'constant':
                return `This constant defines ${this.humanizeName(entity.name)}.\n\n`;
            default:
                return `This ${entity.kind} is defined in the codebase.\n\n`;
        }
    }
    /**
     * Infer purpose from function/method name using heuristics
     */
    inferPurpose(name) {
        const lower = name.toLowerCase();
        if (lower.startsWith('fetch') || lower.startsWith('get')) {
            return 'retrieves data';
        }
        if (lower.startsWith('save') || lower.startsWith('create') || lower.startsWith('post')) {
            return 'persists data';
        }
        if (lower.startsWith('update') || lower.startsWith('put') || lower.startsWith('patch')) {
            return 'modifies data';
        }
        if (lower.startsWith('delete') || lower.startsWith('remove')) {
            return 'removes data';
        }
        if (lower.startsWith('validate') || lower.startsWith('check')) {
            return 'validates input';
        }
        if (lower.startsWith('compute') || lower.startsWith('calculate')) {
            return 'computes values';
        }
        if (lower.startsWith('transform') || lower.startsWith('convert')) {
            return 'transforms data';
        }
        return 'performs an operation';
    }
    /**
     * Convert camelCase/PascalCase to human-readable
     */
    humanizeName(name) {
        return name.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
    }
}
//# sourceMappingURL=markdown-renderer.js.map