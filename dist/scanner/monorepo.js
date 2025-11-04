import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
export function detectMonorepo(rootPath, packageJson = {}, lernaJson, hasNxJson) {
    // Check for Nx
    if (hasNxJson || fs.existsSync(path.join(rootPath, 'nx.json'))) {
        return {
            isMonorepo: true,
            type: 'nx',
            workspaceGlobs: ['apps/*', 'libs/*', 'packages/*']
        };
    }
    // Check for Lerna
    if (lernaJson || fs.existsSync(path.join(rootPath, 'lerna.json'))) {
        const lerna = lernaJson || JSON.parse(fs.readFileSync(path.join(rootPath, 'lerna.json'), 'utf8'));
        return {
            isMonorepo: true,
            type: 'lerna',
            workspaceGlobs: lerna.packages || ['packages/*']
        };
    }
    // Check for pnpm/yarn workspaces
    if (packageJson.workspaces) {
        const globs = Array.isArray(packageJson.workspaces)
            ? packageJson.workspaces
            : packageJson.workspaces.packages || [];
        return {
            isMonorepo: true,
            type: fs.existsSync(path.join(rootPath, 'pnpm-workspace.yaml'))
                ? 'pnpm-workspaces'
                : 'yarn-workspaces',
            workspaceGlobs: globs
        };
    }
    return { isMonorepo: false };
}
export async function buildPackageMap(rootPath, workspaceGlobs) {
    const packages = [];
    for (const pattern of workspaceGlobs) {
        const matches = await glob(pattern, {
            cwd: rootPath,
            absolute: false
        });
        for (const match of matches) {
            const pkgPath = path.join(rootPath, match);
            const pkgJsonPath = path.join(pkgPath, 'package.json');
            if (fs.existsSync(pkgJsonPath)) {
                const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
                // Normalize path to POSIX format
                const normalizedPath = match.replace(/\\/g, '/');
                packages.push({
                    id: pkgJson.name || normalizedPath,
                    name: pkgJson.name || normalizedPath,
                    path: normalizedPath,
                    files: [] // Will be populated by scanner
                });
            }
        }
    }
    return { packages };
}
//# sourceMappingURL=monorepo.js.map