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
}
//# sourceMappingURL=fact-extractor.d.ts.map