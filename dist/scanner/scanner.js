import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { IgnoreRules } from './ignore-rules';
import { detectMonorepo, buildPackageMap } from './monorepo';
export class Scanner {
    rootPath;
    ignoreRules;
    constructor(rootPath, ignoreOptions = {}) {
        this.rootPath = rootPath;
        this.ignoreRules = new IgnoreRules(rootPath, ignoreOptions);
    }
    async scan() {
        // Detect monorepo
        const packageJsonPath = path.join(this.rootPath, 'package.json');
        const packageJson = fs.existsSync(packageJsonPath)
            ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
            : {};
        const monorepoDetection = detectMonorepo(this.rootPath, packageJson);
        let packages = { packages: [] };
        if (monorepoDetection.isMonorepo && monorepoDetection.workspaceGlobs) {
            packages = await buildPackageMap(this.rootPath, monorepoDetection.workspaceGlobs);
        }
        // Scan files
        const pattern = '**/*.{ts,tsx,js,jsx,json,yaml,yml,sql}';
        const files = await glob(pattern, {
            cwd: this.rootPath,
            absolute: true,
            nodir: true,
            dot: true // Include dotfiles (e.g., .eslintrc.yml)
        });
        const entries = [];
        for (const absolutePath of files) {
            const relativePath = path.relative(this.rootPath, absolutePath).replace(/\\/g, '/');
            // Apply ignore rules
            if (this.ignoreRules.shouldIgnore(relativePath)) {
                continue;
            }
            const stats = fs.statSync(absolutePath);
            const kind = this.classifyFile(relativePath);
            // Determine package ID for monorepos
            let packageId;
            for (const pkg of packages.packages) {
                if (relativePath.startsWith(pkg.path + '/')) {
                    packageId = pkg.id;
                    pkg.files.push(relativePath);
                    break;
                }
            }
            entries.push({
                path: relativePath,
                absolutePath,
                kind,
                packageId,
                size: stats.size
            });
        }
        // Sort for deterministic ordering
        entries.sort((a, b) => a.path.localeCompare(b.path));
        return {
            entries,
            packages,
            rootPath: this.rootPath
        };
    }
    classifyFile(filePath) {
        // Test files
        if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__/')) {
            return 'test';
        }
        // Contract files (OpenAPI, SQL)
        if (filePath.includes('openapi') || filePath.includes('swagger') || filePath.endsWith('.sql')) {
            return 'contract';
        }
        // Config files
        if (filePath.endsWith('.json') || filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
            return 'config';
        }
        // Code files
        return 'code';
    }
}
//# sourceMappingURL=scanner.js.map