import { SourceFile } from 'ts-morph';
import { Entity, Relation, FactSet } from '../kb/models.js';
export interface ExtractionResult {
    entities: Entity[];
    relations: Relation[];
    factSets: FactSet[];
}
export declare class FactExtractor {
    private existingAnchors;
    extract(sourceFile: SourceFile, filePath: string): ExtractionResult;
    private detectSideEffects;
    private detectErrors;
    /**
     * Phase 3 Step 3: Detect if a function returns JSX (React component).
     * Checks for:
     * - JSX.Element or ReactElement in return type
     * - JSX elements or self-closing elements in body
     */
    private detectJSXReturn;
}
//# sourceMappingURL=fact-extractor.d.ts.map