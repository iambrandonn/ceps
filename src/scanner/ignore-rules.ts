import ignore, { Ignore } from 'ignore';
import * as path from 'path';
import * as fs from 'fs';

const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  'node_modules/**',
  '**/dist/**',
  'dist/**',
  '**/build/**',
  'build/**',
  '**/.next/**',
  '.next/**',
  '**/coverage/**',
  'coverage/**',
  '**/*.min.js',
  '**/*-[a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9][a-f0-9]*.js', // Bundled files with hashes (min 6 hex chars)
  '**/*.bundle.js',
  '**/.git/**',
  '.git/**',
  '.DS_Store',
  '**/.DS_Store'
];

export interface IgnoreRulesOptions {
  ignore?: string[];
  include?: string[];
  gitignorePatterns?: string[];
  respectGitignore?: boolean;
}

export class IgnoreRules {
  private ignorer: Ignore;

  constructor(
    private rootPath: string,
    options: IgnoreRulesOptions = {}
  ) {
    this.ignorer = ignore();

    // Collect all patterns in order of precedence, then add as single batch
    // This ensures negation patterns can properly override earlier patterns
    const allPatterns: string[] = [];

    // 1. Defaults (lowest precedence)
    allPatterns.push(...DEFAULT_IGNORE_PATTERNS);

    // 2. Load .gitignore if present and requested
    if (options.respectGitignore !== false) {
      const gitignorePath = path.join(rootPath, '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const patterns = fs.readFileSync(gitignorePath, 'utf8')
          .split('\n')
          .filter(line => line.trim() && !line.startsWith('#'));
        allPatterns.push(...patterns);
      }
    }

    // 3. Explicit gitignore patterns from options
    if (options.gitignorePatterns) {
      // Normalize trailing-slash directory patterns to /** patterns
      // This allows negation to work properly (build/ → build/**)
      const normalized = options.gitignorePatterns.map(p =>
        p.endsWith('/') && !p.endsWith('**/') ? p + '**' : p
      );
      allPatterns.push(...normalized);
    }

    // 4. Explicit ignore patterns (higher precedence)
    if (options.ignore) {
      allPatterns.push(...options.ignore);
    }

    // 5. Explicit include patterns (negations, highest precedence)
    if (options.include) {
      allPatterns.push(...options.include);
    }

    // Add all patterns at once for proper precedence handling
    this.ignorer.add(allPatterns);
  }

  shouldIgnore(filePath: string): boolean {
    // Normalize to POSIX
    const normalized = filePath.replace(/\\/g, '/');
    return this.ignorer.ignores(normalized);
  }
}
