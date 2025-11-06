import { KnowledgeBase } from '../kb/knowledge-base.js';
export interface ImpactScopeOptions {
    maxHops?: number;
    maxNodes?: number;
    scope?: 'auto' | 'full';
    includeDirectories?: boolean;
}
export interface ImpactReport {
    seedQids: string[];
    resolvedEntities: string[];
    impactedEntities: string[];
    impactedDirectories: string[];
    diagnostics: {
        hopsTraversed: number;
        nodesTraversed: number;
        capped: boolean;
        excluded: string[];
        warnings: string[];
    };
}
export declare function computeImpactReport(kb: KnowledgeBase, resolvedQids: string[], options?: ImpactScopeOptions): ImpactReport;
//# sourceMappingURL=impact-scope.d.ts.map