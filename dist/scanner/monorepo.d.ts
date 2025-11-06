import { PackageMap } from '../types/index.js';
export interface MonorepoDetectionResult {
    isMonorepo: boolean;
    type?: 'pnpm-workspaces' | 'lerna' | 'nx' | 'yarn-workspaces';
    workspaceGlobs?: string[];
}
export declare function detectMonorepo(rootPath: string, packageJson?: any, lernaJson?: any, hasNxJson?: boolean): MonorepoDetectionResult;
export declare function buildPackageMap(rootPath: string, workspaceGlobs: string[]): Promise<PackageMap>;
//# sourceMappingURL=monorepo.d.ts.map