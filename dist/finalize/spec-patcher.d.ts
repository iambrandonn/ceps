import { KnowledgeBase } from '../kb/knowledge-base.js';
import type { ImpactReport } from './impact-scope.js';
import type { FailedEntity, ReanalysisResult } from './reanalysis.js';
export interface SpecPatchOptions {
    deterministic?: boolean;
    timestamp?: () => string;
    fs?: {
        readFileSync(filePath: string, encoding: BufferEncoding): string;
        writeFileSync(filePath: string, data: string, encoding: BufferEncoding): void;
        existsSync(filePath: string): boolean;
    };
}
export interface PatchedSection {
    entityId: string;
    entityName: string;
}
export interface SpecPatchReport {
    patchedFiles: Array<{
        path: string;
        sectionsUpdated: PatchedSection[];
    }>;
    failedEntities: FailedEntity[];
    resolvedQids: string[];
    warnings: string[];
}
export declare function patchSpecificationFiles(projectRoot: string, kb: KnowledgeBase, impactReport: ImpactReport, reanalysis: ReanalysisResult, options?: SpecPatchOptions): SpecPatchReport;
//# sourceMappingURL=spec-patcher.d.ts.map