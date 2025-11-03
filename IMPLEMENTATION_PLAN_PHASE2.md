# ceps — Phase 2 Implementation Plan (I/O & Templates) — v1.3

**Date:** 2025-11-03 (Revised after third feedback)
**Phase:** Phase 2 — I/O & Templates (High Parallelization)
**Status:** Ready to Start ✅ (Production-Ready)
**Scope:** Scanner/Loader, Parser/Patterns, Spec Generator (templates), LLM Gateway (full adapters)
**Dependencies:** Phase 1 complete (KB API frozen ✅)
**Estimated Effort:** ~15-20 agent-days total (3-5 days per agent, 4 agents in parallel)
**Critical Path:** Agent 2 (Parser) has longest timeline; buffer days included

**Revision History:**
- v1.0 (2025-11-03): Initial plan
- v1.1 (2025-11-03): Addressed first feedback (CRITICAL-1,2; HIGH-1,2,3; MEDIUM-1,2,3,4,5; added buffer days)
- v1.2 (2025-11-03): Addressed second feedback (MEDIUM-A,B; MINOR-A)
  - Fixed duplicate anchor generation in call relations (extracted inside function loop)
  - Fixed inconsistent SpecGenerator instantiation (all instances use `new SpecGenerator(kb, fileIndex)`)
  - Added clarification note in Section 3.3.2 about constructor signature change
- v1.3 (2025-11-03): Fixed critical regressions from v1.2 (**PRODUCTION-READY**)
  - **CRITICAL-3:** Fixed class/method anchor generation to use content-based signature (consistent with functions)
  - **CRITICAL-3b:** Added method call relation extraction (complete call graph for OOP)
  - **HIGH-4:** Updated documentation version consistency
  - **MEDIUM-C:** Added Section 10 with detailed v1.2/v1.3 changes summary
  - Grade: A- → Production-ready for agent execution

---

## 0) Phase 2 Overview

**Goal:** Build the I/O pipeline and template-based spec generation, enabling end-to-end flow from source code to Markdown specs.

**What Phase 2 delivers:**
1. **WS-B: Scanner & Loader** — File discovery, ignore rules, monorepo detection, FileIndex/PackageMap
2. **WS-C: Parser & Patterns** — TypeScript/Babel parsing, fact extraction (entities, relations including calls), dynamic pattern detection, auxiliary readers
3. **WS-E: Spec Generator (templates)** — Root & per-directory Markdown generation with style kit, anchors/QIDs, monorepo support, no LLM polish yet
4. **WS-F: LLM Gateway (full adapters)** — **Working** provider adapters (Anthropic/OpenAI), caching infrastructure, budget tracking (no grounding validator yet)

**What Phase 2 defers:**
- Confidence scoring algorithm (stubbed in Phase 1) → Phase 3
- Graph indices (callGraph, importGraph, reverseDeps) → Phase 3
- Reasoning & Ambiguity Resolver → Phase 3
- Two-phase cross-link validation → Phase 3
- LLM integration with Spec Generator (polish) → Phase 4
- Grounding Validator → Phase 4
- Quality gates enforcement → Phase 4

**Explicitly NOT in Phase 2:**
- ❌ Confidence scoring algorithm (stubbed as "Medium")
- ❌ Graph indices (call/import graphs, reverse deps)
- ❌ Two-phase cross-link validation (anchors allocated but not validated)
- ❌ LLM-polished prose (templates only)
- ❌ Grounding Validator (LLM adapters work but no validation)
- ❌ Quality gates enforcement (no gate checks)
- ❌ Framework pattern matching (Express, React, etc. - Phase 6)
- ❌ Performance optimization (AST pruning, worker pools - Phase 6)

**Critical checkpoint:** **End-to-End Smoke Test** — Scan → Parse → KB (with relations) → Generate template specs must work before Phase 3.

---

## 0.1) Phase 2 Parallelization Strategy

**Why these 4 agents can work in parallel:**

| Agent | Workstream | Reads from KB | Writes to KB | External Dependencies |
|-------|-----------|---------------|--------------|---------------------|
| **Agent 1** | Scanner & Loader | No | No | None |
| **Agent 2** | Parser & Patterns | No | Yes (entities, facts, factSets) | Scanner's FileIndex API (coordinate on interface) |
| **Agent 3** | Spec Generator | Yes (read-only) | No | KB API (frozen) |
| **Agent 4** | LLM Gateway | No | No | None (skeleton only) |

**Coordination points:**
1. **Scanner → Parser interface:** Agent 1 and Agent 2 must agree on `FileIndex` and `FileEntry` interfaces early (Day 1)
2. **Parser → KB:** Agent 2 uses frozen KB API from Phase 1 (no coordination needed)
3. **KB → Generator:** Agent 3 uses frozen KB API from Phase 1 (no coordination needed)
4. **Integration test:** All agents converge at end for smoke test

**Recommended approach:**
- **Day 1 kickoff:** All 4 agents meet to agree on Scanner → Parser interface (FileIndex/FileEntry)
- **Days 1-3:** Independent implementation with TDD
- **Day 4:** Integration and smoke test

---

## 1) Prerequisites (Before Agent Execution)

### 1.1 Verify Phase 1 Complete
- ✅ Phase 1 acceptance criteria met
- ✅ KB API frozen and documented (docs/API.md)
- ✅ 62 tests passing with ≥80% coverage
- ✅ CI pipeline green

### 1.2 Repository Structure for Phase 2
```
ceps/
├── src/
│   ├── kb/                    # Phase 1 (complete)
│   ├── orchestrator/          # Phase 1 (minimal CLI)
│   ├── scanner/               # Phase 2 - Agent 1
│   │   ├── scanner.ts
│   │   ├── ignore-rules.ts
│   │   └── monorepo.ts
│   ├── parser/                # Phase 2 - Agent 2
│   │   ├── parser.ts
│   │   ├── fact-extractor.ts
│   │   ├── pattern-detector.ts
│   │   └── aux-readers/
│   │       ├── test-reader.ts
│   │       ├── config-reader.ts
│   │       └── contract-reader.ts
│   ├── generator/             # Phase 2 - Agent 3
│   │   ├── spec-generator.ts
│   │   ├── markdown-renderer.ts
│   │   └── style-kit.ts
│   ├── llm/                   # Phase 2 - Agent 4
│   │   ├── gateway.ts
│   │   ├── adapters/
│   │   │   ├── anthropic.ts
│   │   │   ├── openai.ts
│   │   │   └── local.ts
│   │   ├── cache.ts
│   │   └── budget.ts
│   └── types/
│       └── index.ts           # Shared types
├── tests/
│   ├── unit/
│   │   ├── scanner/
│   │   ├── parser/
│   │   ├── generator/
│   │   └── llm/
│   ├── integration/
│   │   └── phase2-smoke.test.ts
│   └── fixtures/              # Phase 2 test fixtures
│       ├── tiny-express/
│       ├── tiny-react/
│       └── tiny-monorepo/
└── docs/
    └── API.md                 # Update with Phase 2 APIs
```

### 1.3 Shared Type Definitions (Coordinate Day 1)

**Critical:** Agents 1 & 2 must agree on these interfaces before starting implementation.

`src/types/index.ts` (additions for Phase 2):
```typescript
// Scanner outputs (Agent 1)
export interface FileEntry {
  path: string;           // Repo-relative POSIX path
  absolutePath: string;   // Absolute filesystem path
  kind: 'code' | 'test' | 'config' | 'contract';
  packageId?: string;     // For monorepos
  size: number;           // File size in bytes
}

export interface FileIndex {
  entries: FileEntry[];
  packages: PackageMap;
  rootPath: string;
}

export interface PackageMap {
  packages: Array<{
    id: string;
    name: string;
    path: string;
    files: string[];      // Paths relative to package root
  }>;
}

// Parser outputs (Agent 2)
export interface ParseResult {
  filePath: string;
  entities: Entity[];     // From KB models
  relations: Relation[];  // From KB models
  factSets: FactSet[];    // From KB models
  errors: ParseError[];
}

export interface ParseError {
  filePath: string;
  message: string;
  severity: 'warning' | 'error';
  location?: { line: number; column: number };
}
```

---

## 2) Agent Workstreams (4 Parallel Implementations)

---

## Agent 1: Scanner & Loader (WS-B) — ~3-4 agent-days

**CTS Reference:** CTS-05 §2 (Scanner & Loader)

**Deliverables:**
1. File discovery with ignore rules (`.gitignore`, `node_modules`, minified files)
2. Monorepo detection (workspaces, Lerna, Nx)
3. File classification (code vs test vs config vs contract)
4. FileIndex with deterministic ordering
5. PackageMap for monorepos

### Step 1.1: Ignore Rules Engine (TDD, ~1 day)

**Goal:** Implement ignore precedence and pattern matching.

#### 1.1.1 Write Failing Tests First
`tests/unit/scanner/ignore-rules.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { IgnoreRules, shouldIgnore } from '../../../src/scanner/ignore-rules';

describe('Ignore Rules', () => {
  it('should ignore node_modules by default', () => {
    const rules = new IgnoreRules('/project/root');
    expect(rules.shouldIgnore('node_modules/foo/bar.js')).toBe(true);
    expect(rules.shouldIgnore('src/node_modules/foo.js')).toBe(true);
  });

  it('should ignore common build directories', () => {
    const rules = new IgnoreRules('/project/root');
    expect(rules.shouldIgnore('dist/bundle.js')).toBe(true);
    expect(rules.shouldIgnore('build/output.js')).toBe(true);
    expect(rules.shouldIgnore('.next/cache/foo.js')).toBe(true);
  });

  it('should ignore minified files', () => {
    const rules = new IgnoreRules('/project/root');
    expect(rules.shouldIgnore('lib/vendor.min.js')).toBe(true);
    expect(rules.shouldIgnore('lib/bundle-abc123.js')).toBe(true);
  });

  it('should respect .gitignore patterns', () => {
    const rules = new IgnoreRules('/project/root', {
      gitignorePatterns: ['*.log', 'temp/']
    });
    expect(rules.shouldIgnore('debug.log')).toBe(true);
    expect(rules.shouldIgnore('temp/cache.js')).toBe(true);
  });

  it('should support explicit overrides', () => {
    const rules = new IgnoreRules('/project/root', {
      ignore: ['src/generated/**'],
      include: ['!src/generated/keep.ts']
    });
    expect(rules.shouldIgnore('src/generated/foo.ts')).toBe(true);
    expect(rules.shouldIgnore('src/generated/keep.ts')).toBe(false);
  });

  it('should handle precedence: explicit > gitignore > defaults', () => {
    const rules = new IgnoreRules('/project/root', {
      gitignorePatterns: ['build/'],
      include: ['!build/important.ts']
    });
    expect(rules.shouldIgnore('build/output.js')).toBe(true);
    expect(rules.shouldIgnore('build/important.ts')).toBe(false);
  });
});
```

#### 1.1.2 Implement Ignore Rules
`src/scanner/ignore-rules.ts`:
```typescript
import ignore, { Ignore } from 'ignore';
import * as path from 'path';
import * as fs from 'fs';

const DEFAULT_IGNORE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  '.next/**',
  'coverage/**',
  '**/*.min.js',
  '**/*-[a-f0-9]{6,}.js', // Bundled files with hashes
  '**/*.bundle.js',
  '.git/**',
  '.DS_Store'
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

    // Load .gitignore if present and requested
    if (options.respectGitignore !== false) {
      const gitignorePath = path.join(rootPath, '.gitignore');
      if (fs.existsSync(gitignorePath)) {
        const patterns = fs.readFileSync(gitignorePath, 'utf8')
          .split('\n')
          .filter(line => line.trim() && !line.startsWith('#'));
        this.ignorer.add(patterns);
      }
    }

    // Add patterns in order of precedence
    this.ignorer.add(DEFAULT_IGNORE_PATTERNS);
    if (options.gitignorePatterns) {
      this.ignorer.add(options.gitignorePatterns);
    }
    if (options.ignore) {
      this.ignorer.add(options.ignore);
    }
    if (options.include) {
      // Negation patterns (! prefix)
      this.ignorer.add(options.include);
    }
  }

  shouldIgnore(filePath: string): boolean {
    // Normalize to POSIX
    const normalized = filePath.replace(/\\/g, '/');
    return this.ignorer.ignores(normalized);
  }
}
```

### Step 1.2: Monorepo Detection (TDD, ~0.5 days)

#### 1.2.1 Write Failing Tests First
`tests/unit/scanner/monorepo.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { detectMonorepo, buildPackageMap } from '../../../src/scanner/monorepo';
import * as fs from 'fs';
import * as path from 'path';

describe('Monorepo Detection', () => {
  it('should detect pnpm workspaces', () => {
    const mockRoot = '/project';
    const mockPackageJson = {
      workspaces: ['packages/*', 'apps/*']
    };

    // Mock fs.existsSync and fs.readFileSync
    const result = detectMonorepo(mockRoot, mockPackageJson);
    expect(result.isMonorepo).toBe(true);
    expect(result.type).toBe('pnpm-workspaces');
  });

  it('should detect Lerna monorepo', () => {
    const mockRoot = '/project';
    const lernaJson = { packages: ['packages/*'] };

    const result = detectMonorepo(mockRoot, {}, lernaJson);
    expect(result.isMonorepo).toBe(true);
    expect(result.type).toBe('lerna');
  });

  it('should detect Nx monorepo', () => {
    const mockRoot = '/project';

    const result = detectMonorepo(mockRoot, {}, null, true);
    expect(result.isMonorepo).toBe(true);
    expect(result.type).toBe('nx');
  });

  it('should return false for non-monorepo', () => {
    const mockRoot = '/project';
    const result = detectMonorepo(mockRoot, {});
    expect(result.isMonorepo).toBe(false);
  });
});

describe('Package Map Building', () => {
  it('should build package map from workspace globs', async () => {
    const mockRoot = '/project';
    const workspaceGlobs = ['packages/*'];

    // Mock glob and fs operations
    const packageMap = await buildPackageMap(mockRoot, workspaceGlobs);
    expect(packageMap.packages.length).toBeGreaterThan(0);
    expect(packageMap.packages[0]).toHaveProperty('id');
    expect(packageMap.packages[0]).toHaveProperty('name');
    expect(packageMap.packages[0]).toHaveProperty('path');
  });
});
```

#### 1.2.2 Implement Monorepo Detection
`src/scanner/monorepo.ts`:
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { PackageMap } from '../types';

export interface MonorepoDetectionResult {
  isMonorepo: boolean;
  type?: 'pnpm-workspaces' | 'lerna' | 'nx' | 'yarn-workspaces';
  workspaceGlobs?: string[];
}

export function detectMonorepo(
  rootPath: string,
  packageJson: any = {},
  lernaJson?: any,
  hasNxJson?: boolean
): MonorepoDetectionResult {
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

export async function buildPackageMap(
  rootPath: string,
  workspaceGlobs: string[]
): Promise<PackageMap> {
  const packages = [];

  for (const pattern of workspaceGlobs) {
    const matches = await glob(pattern, {
      cwd: rootPath,
      absolute: false,
      onlyDirectories: true
    });

    for (const match of matches) {
      const pkgPath = path.join(rootPath, match);
      const pkgJsonPath = path.join(pkgPath, 'package.json');

      if (fs.existsSync(pkgJsonPath)) {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
        packages.push({
          id: pkgJson.name || match,
          name: pkgJson.name || match,
          path: match,
          files: [] // Will be populated by scanner
        });
      }
    }
  }

  return { packages };
}
```

### Step 1.3: File Scanner (TDD, ~1.5 days)

#### 1.3.1 Write Failing Tests First
`tests/unit/scanner/scanner.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { Scanner } from '../../../src/scanner/scanner';
import { FileEntry, FileIndex } from '../../../src/types';

describe('Scanner', () => {
  it('should scan a simple project', async () => {
    const scanner = new Scanner('/path/to/project');
    const index = await scanner.scan();

    expect(index.entries.length).toBeGreaterThan(0);
    expect(index.rootPath).toBe('/path/to/project');
  });

  it('should classify files correctly', async () => {
    const scanner = new Scanner('/path/to/project');
    const index = await scanner.scan();

    const codeFiles = index.entries.filter(e => e.kind === 'code');
    const testFiles = index.entries.filter(e => e.kind === 'test');

    expect(codeFiles.length).toBeGreaterThan(0);
    expect(testFiles.some(f => f.path.includes('.test.'))).toBe(true);
  });

  it('should respect ignore rules', async () => {
    const scanner = new Scanner('/path/to/project', {
      ignore: ['src/generated/**']
    });
    const index = await scanner.scan();

    expect(index.entries.some(e => e.path.includes('node_modules'))).toBe(false);
    expect(index.entries.some(e => e.path.includes('generated'))).toBe(false);
  });

  it('should detect monorepo packages', async () => {
    const scanner = new Scanner('/path/to/monorepo');
    const index = await scanner.scan();

    if (index.packages.packages.length > 0) {
      expect(index.packages.packages[0]).toHaveProperty('id');
      expect(index.packages.packages[0]).toHaveProperty('files');
    }
  });

  it('should produce deterministic ordering', async () => {
    const scanner = new Scanner('/path/to/project');
    const index1 = await scanner.scan();
    const index2 = await scanner.scan();

    expect(index1.entries.map(e => e.path)).toEqual(index2.entries.map(e => e.path));
  });
});
```

#### 1.3.2 Implement Scanner
`src/scanner/scanner.ts`:
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { FileEntry, FileIndex, PackageMap } from '../types';
import { IgnoreRules, IgnoreRulesOptions } from './ignore-rules';
import { detectMonorepo, buildPackageMap } from './monorepo';

export class Scanner {
  private ignoreRules: IgnoreRules;

  constructor(
    private rootPath: string,
    ignoreOptions: IgnoreRulesOptions = {}
  ) {
    this.ignoreRules = new IgnoreRules(rootPath, ignoreOptions);
  }

  async scan(): Promise<FileIndex> {
    // Detect monorepo
    const packageJsonPath = path.join(this.rootPath, 'package.json');
    const packageJson = fs.existsSync(packageJsonPath)
      ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      : {};

    const monorepoDetection = detectMonorepo(this.rootPath, packageJson);

    let packages: PackageMap = { packages: [] };
    if (monorepoDetection.isMonorepo && monorepoDetection.workspaceGlobs) {
      packages = await buildPackageMap(this.rootPath, monorepoDetection.workspaceGlobs);
    }

    // Scan files
    const pattern = '**/*.{ts,tsx,js,jsx,json,yaml,yml,sql}';
    const files = await glob(pattern, {
      cwd: this.rootPath,
      absolute: true,
      nodir: true,
      dot: false
    });

    const entries: FileEntry[] = [];

    for (const absolutePath of files) {
      const relativePath = path.relative(this.rootPath, absolutePath).replace(/\\/g, '/');

      // Apply ignore rules
      if (this.ignoreRules.shouldIgnore(relativePath)) {
        continue;
      }

      const stats = fs.statSync(absolutePath);
      const kind = this.classifyFile(relativePath);

      // Determine package ID for monorepos
      let packageId: string | undefined;
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

  private classifyFile(filePath: string): FileEntry['kind'] {
    // Test files
    if (filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__/')) {
      return 'test';
    }

    // Config files
    if (filePath.endsWith('.json') || filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
      return 'config';
    }

    // Contract files (OpenAPI, SQL)
    if (filePath.includes('openapi') || filePath.includes('swagger') || filePath.endsWith('.sql')) {
      return 'contract';
    }

    // Code files
    return 'code';
  }
}
```

### Step 1.4: Integration with Orchestrator (0.5 days)

Update `src/orchestrator/index.ts` to use Scanner:
```typescript
import { Scanner } from '../scanner/scanner';

export async function run(argv: string[]): Promise<number> {
  try {
    const args = parseArgs(argv);
    validateArgs(args);

    console.log('ceps v0.2.0 (Phase 2)');
    console.log(`Project root: ${args.projectRoot}`);

    // Phase 2: Scanner
    console.log('Scanning files...');
    const scanner = new Scanner(args.projectRoot);
    const fileIndex = await scanner.scan();
    console.log(`Found ${fileIndex.entries.length} files`);

    if (fileIndex.packages.packages.length > 0) {
      console.log(`Detected monorepo with ${fileIndex.packages.packages.length} packages`);
    }

    // TODO: Parser → KB → Generator pipeline

    return 0;
  } catch (error) {
    console.error('Error:', (error as Error).message);
    return 1;
  }
}
```

### Agent 1 Acceptance Criteria
- ✅ All ignore rule tests pass (≥80% coverage)
- ✅ Monorepo detection works for pnpm/Lerna/Nx/Yarn workspaces
- ✅ File classification is accurate (code/test/config/contract)
- ✅ Deterministic ordering (same input → same FileIndex order)
- ✅ Integration with orchestrator works
- ✅ Unit tests ≥80% branch coverage for scanner module

---

## Agent 2: Parser & Patterns (WS-C) — ~5 agent-days

**CTS Reference:** CTS-05 §3-5 (Parser, Fact Extractor, Pattern Detector, Aux Readers)

**Deliverables:**
1. TypeScript compiler API parser with ts-morph
2. Babel fallback for edge syntax
3. Fact extraction (entities, **call relations**, import/export relations, facts)
4. Dynamic pattern detector (eval, Proxy, dynamic imports, etc.)
5. Auxiliary readers (tests, config; OpenAPI/SQL deferred to Phase 6)

**Note:** This is the most complex workstream in Phase 2. Timeline increased from 4 to 5 days to account for call relation extraction and comprehensive fact extraction.

### Step 2.1: Parser Infrastructure (TDD, ~1 day)

#### 2.1.1 Write Failing Tests First
`tests/unit/parser/parser.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { Parser } from '../../../src/parser/parser';
import { ParseResult } from '../../../src/types';

describe('Parser', () => {
  it('should parse a simple TypeScript file', async () => {
    const source = `
      export function fetchUser(id: string): Promise<User> {
        return fetch(\`/api/users/\${id}\`).then(r => r.json());
      }
    `;

    const parser = new Parser();
    const result = await parser.parse('src/api/users.ts', source);

    expect(result.entities.length).toBeGreaterThan(0);
    expect(result.entities[0].kind).toBe('function');
    expect(result.entities[0].name).toBe('fetchUser');
  });

  it('should extract function signatures', async () => {
    const source = `
      export function add(a: number, b: number): number {
        return a + b;
      }
    `;

    const parser = new Parser();
    const result = await parser.parse('src/math.ts', source);

    const func = result.entities.find(e => e.name === 'add');
    expect(func?.signature).toContain('(a: number, b: number): number');
  });

  it('should detect exported entities', async () => {
    const source = `
      export const API_URL = 'https://api.example.com';
      const SECRET = 'hidden';
    `;

    const parser = new Parser();
    const result = await parser.parse('src/config.ts', source);

    const apiUrl = result.entities.find(e => e.name === 'API_URL');
    const secret = result.entities.find(e => e.name === 'SECRET');

    expect(apiUrl?.exported).toBe(true);
    expect(secret?.exported).toBe(false);
  });

  it('should fall back to Babel for edge syntax', async () => {
    const source = `
      const foo = async () => {
        const bar = await import('./dynamic');
      };
    `;

    const parser = new Parser();
    const result = await parser.parse('src/dynamic.js', source);

    expect(result.errors).toHaveLength(0);
  });

  it('should handle parse errors gracefully', async () => {
    const source = `
      export function broken( {
        // Missing closing brace
    `;

    const parser = new Parser();
    const result = await parser.parse('src/broken.ts', source);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0].severity).toBe('error');
  });
});
```

#### 2.1.2 Implement Parser
`src/parser/parser.ts`:
```typescript
import { Project, SourceFile, SyntaxKind, ScriptTarget, ModuleKind, JsxEmit } from 'ts-morph';
import * as babel from '@babel/parser';
import { ParseResult, ParseError, Entity, Relation, FactSet } from '../types';
import { FactExtractor } from './fact-extractor';
import { PatternDetector } from './pattern-detector';

export class Parser {
  private project: Project;
  private factExtractor: FactExtractor;
  private patternDetector: PatternDetector;

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: ScriptTarget.ESNext,
        module: ModuleKind.ESNext,
        allowJs: true,
        jsx: JsxEmit.React
      }
    });
    this.factExtractor = new FactExtractor();
    this.patternDetector = new PatternDetector();
  }

  async parse(filePath: string, source: string): Promise<ParseResult> {
    let sourceFile: SourceFile | null = null;
    const errors: ParseError[] = [];
    let entities: Entity[] = [];
    let relations: Relation[] = [];
    let factSets: FactSet[] = [];

    try {
      // Try TypeScript compiler API first
      sourceFile = this.project.createSourceFile(filePath, source, { overwrite: true });

      // Extract facts
      const extractResult = this.factExtractor.extract(sourceFile, filePath);
      entities = extractResult.entities;
      relations = extractResult.relations;
      factSets = extractResult.factSets;

      // Detect dynamic patterns
      const patternWarnings = this.patternDetector.detect(sourceFile, filePath);
      errors.push(...patternWarnings);

    } catch (error) {
      // Fall back to Babel
      try {
        const ast = babel.parse(source, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx']
        });

        // Extract facts from Babel AST (simplified)
        // TODO: Implement Babel fact extraction
        errors.push({
          filePath,
          message: 'Using Babel fallback parser (limited fact extraction)',
          severity: 'warning'
        });
      } catch (babelError) {
        errors.push({
          filePath,
          message: `Parse error: ${(error as Error).message}`,
          severity: 'error'
        });
      }
    }

    return {
      filePath,
      entities,
      relations,
      factSets,
      errors
    };
  }
}
```

### Step 2.2: Fact Extractor (TDD, ~1.5 days)

#### 2.2.1 Write Failing Tests First
`tests/unit/parser/fact-extractor.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { FactExtractor } from '../../../src/parser/fact-extractor';

describe('Fact Extractor', () => {
  it('should extract function entities', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      export function greet(name: string): string {
        return 'Hello ' + name;
      }
    `);

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    expect(result.entities.length).toBe(1);
    expect(result.entities[0].kind).toBe('function');
    expect(result.entities[0].name).toBe('greet');
    expect(result.entities[0].exported).toBe(true);
  });

  it('should extract class entities', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      export class UserService {
        async getUser(id: string) {
          return fetch('/api/users/' + id);
        }
      }
    `);

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    const classEntity = result.entities.find(e => e.kind === 'class');
    const methodEntity = result.entities.find(e => e.kind === 'method');

    expect(classEntity).toBeDefined();
    expect(classEntity?.name).toBe('UserService');
    expect(methodEntity).toBeDefined();
    expect(methodEntity?.name).toBe('getUser');
  });

  it('should extract import/export relations', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      import { foo } from './foo';
      export { bar } from './bar';
    `);

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    const importRelation = result.relations.find(r => r.predicate === 'imports');
    const exportRelation = result.relations.find(r => r.predicate === 'exports');

    expect(importRelation).toBeDefined();
    expect(exportRelation).toBeDefined();
  });

  it('should detect side effects (I/O, network, DB)', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      export function saveUser(user: User) {
        fetch('/api/users', { method: 'POST', body: JSON.stringify(user) });
        localStorage.setItem('user', user.id);
      }
    `);

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    const entity = result.entities.find(e => e.name === 'saveUser');
    expect(entity?.attributes?.sideEffects).toContain('network');
    expect(entity?.attributes?.sideEffects).toContain('storage');
  });

  it('should extract JSDoc comments', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      /**
       * Fetches a user by ID
       * @param id - User ID
       * @returns User object
       */
      export function fetchUser(id: string): Promise<User> {
        return fetch(\`/api/users/\${id}\`).then(r => r.json());
      }
    `);

    const extractor = new FactExtractor();
    const result = extractor.extract(sourceFile, 'test.ts');

    const factSet = result.factSets.find(fs =>
      fs.facts.some(f => f.predicate === 'has-jsdoc')
    );
    expect(factSet).toBeDefined();
  });
});
```

#### 2.2.2 Implement Fact Extractor
`src/parser/fact-extractor.ts`:
```typescript
import { SourceFile, SyntaxKind, Node, CallExpression } from 'ts-morph';
import { Entity, Relation, FactSet, Fact, Source } from '../types';
import { generateAnchor } from '../kb/id-generation';

export interface ExtractionResult {
  entities: Entity[];
  relations: Relation[];
  factSets: FactSet[];
}

export class FactExtractor {
  private existingAnchors: Set<string> = new Set();

  extract(sourceFile: SourceFile, filePath: string): ExtractionResult {
    const entities: Entity[] = [];
    const relations: Relation[] = [];
    const factSets: FactSet[] = [];

    // Extract functions
    sourceFile.getFunctions().forEach(func => {
      const name = func.getName() || '<anonymous>';
      const isExported = func.isExported();
      const signature = func.getSignature().getText();

      // FIX MEDIUM-1: Use function body content for anchor, not filePath
      const content = func.getText();
      const entityId = generateAnchor(name, content, this.existingAnchors);
      this.existingAnchors.add(entityId);

      const entity: Entity = {
        id: entityId,
        kind: 'function',
        name,
        path: filePath,
        signature,
        exported: isExported,
        visibility: isExported ? 'public' : 'internal',
        attributes: {
          sideEffects: this.detectSideEffects(func),
          errors: this.detectErrors(func)
        }
      };

      entities.push(entity);

      // Create factSet
      const facts: Fact[] = [
        { subjectId: entityId, predicate: 'is-function', object: true },
        { subjectId: entityId, predicate: 'has-signature', object: signature }
      ];

      const jsdoc = func.getJsDocs();
      if (jsdoc.length > 0) {
        facts.push({
          subjectId: entityId,
          predicate: 'has-jsdoc',
          object: jsdoc[0].getDescription()
        });
      }

      factSets.push({
        id: `${entityId}-facts`,
        facts,
        sources: [{ kind: 'ast', file: filePath }],
        evidenceScore: 90 // High confidence for direct AST extraction
      });

      // FIX MEDIUM-A (v1.2): Extract call relations for this function
      // Extract calls INSIDE the function loop to reuse entityId (avoid duplicate anchors)
      func.forEachDescendant(node => {
        if (node.getKind() === SyntaxKind.CallExpression) {
          const callExpr = node as CallExpression;
          const calleeExpr = callExpr.getExpression().getText();

          // Create call relation (this function → callee)
          relations.push({
            subjectId: entityId, // Use existing entity ID (not a new anchor)
            predicate: 'calls',
            objectId: calleeExpr, // Simplified; Phase 3 will resolve to entity IDs
            source: { kind: 'ast', file: filePath }
          });
        }
      });
    });

    // Extract classes
    sourceFile.getClasses().forEach(cls => {
      const name = cls.getName() || '<anonymous>';
      const isExported = cls.isExported();

      // FIX CRITICAL-3 (v1.3): Use content-based anchoring (consistent with functions)
      const content = cls.getText();
      const entityId = generateAnchor(name, content, this.existingAnchors);
      this.existingAnchors.add(entityId);

      entities.push({
        id: entityId,
        kind: 'class',
        name,
        path: filePath,
        exported: isExported,
        visibility: isExported ? 'public' : 'internal'
      });

      // Extract methods
      cls.getMethods().forEach(method => {
        const methodName = method.getName();

        // FIX CRITICAL-3 (v1.3): Use content-based anchoring (consistent with functions)
        const methodContent = method.getText();
        const methodId = generateAnchor(`${name}.${methodName}`, methodContent, this.existingAnchors);
        this.existingAnchors.add(methodId);

        entities.push({
          id: methodId,
          kind: 'method',
          name: methodName,
          path: filePath,
          signature: method.getSignature().getText(),
          exported: isExported, // Methods inherit class visibility
          visibility: isExported ? 'public' : 'internal'
        });

        // FIX CRITICAL-3b (v1.3): Extract call relations for methods (similar to functions)
        method.forEachDescendant(node => {
          if (node.getKind() === SyntaxKind.CallExpression) {
            const callExpr = node as CallExpression;
            const calleeExpr = callExpr.getExpression().getText();

            // Create call relation (this method → callee)
            relations.push({
              subjectId: methodId, // Use existing method ID (not a new anchor)
              predicate: 'calls',
              objectId: calleeExpr, // Simplified; Phase 3 will resolve to entity IDs
              source: { kind: 'ast', file: filePath }
            });
          }
        });
      });
    });

    // Extract imports
    sourceFile.getImportDeclarations().forEach(imp => {
      const moduleSpecifier = imp.getModuleSpecifierValue();

      relations.push({
        subjectId: filePath,
        predicate: 'imports',
        objectId: moduleSpecifier,
        source: { kind: 'ast', file: filePath }
      });
    });

    // Extract exports
    sourceFile.getExportDeclarations().forEach(exp => {
      const moduleSpecifier = exp.getModuleSpecifierValue();

      if (moduleSpecifier) {
        relations.push({
          subjectId: filePath,
          predicate: 'exports',
          objectId: moduleSpecifier,
          source: { kind: 'ast', file: filePath }
        });
      }
    });

    // Note: Call relations are now extracted inside the function loop above (FIX MEDIUM-A)
    // This avoids creating duplicate anchors for the same function

    return { entities, relations, factSets };
  }

  private detectSideEffects(node: Node): string[] {
    const sideEffects: string[] = [];
    const text = node.getText();

    // Network calls
    if (text.includes('fetch(') || text.includes('axios.') || text.includes('http.')) {
      sideEffects.push('network');
    }

    // Storage
    if (text.includes('localStorage') || text.includes('sessionStorage')) {
      sideEffects.push('storage');
    }

    // File I/O
    if (text.includes('fs.') || text.includes('readFile') || text.includes('writeFile')) {
      sideEffects.push('filesystem');
    }

    // Database
    if (text.includes('prisma.') || text.includes('.query(') || text.includes('.execute(')) {
      sideEffects.push('database');
    }

    return sideEffects;
  }

  private detectErrors(node: Node): string[] {
    const errors: string[] = [];

    node.forEachDescendant(descendant => {
      if (descendant.getKind() === SyntaxKind.ThrowStatement) {
        const throwText = descendant.getText();
        errors.push(throwText.replace('throw ', '').trim());
      }
    });

    return errors;
  }
}
```

### Step 2.3: Pattern Detector (TDD, ~1 day)

#### 2.3.1 Write Failing Tests First
`tests/unit/parser/pattern-detector.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { Project } from 'ts-morph';
import { PatternDetector } from '../../../src/parser/pattern-detector';

describe('Pattern Detector', () => {
  it('should detect eval usage', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      const code = 'console.log("dynamic")';
      eval(code);
    `);

    const detector = new PatternDetector();
    const warnings = detector.detect(sourceFile, 'test.ts');

    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].message).toContain('eval');
  });

  it('should detect dynamic imports', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      const moduleName = './module';
      import(moduleName).then(m => m.default());
    `);

    const detector = new PatternDetector();
    const warnings = detector.detect(sourceFile, 'test.ts');

    expect(warnings.some(w => w.message.includes('dynamic import'))).toBe(true);
  });

  it('should detect Proxy usage', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      const handler = { get: (target, prop) => target[prop] };
      const proxy = new Proxy({}, handler);
    `);

    const detector = new PatternDetector();
    const warnings = detector.detect(sourceFile, 'test.ts');

    expect(warnings.some(w => w.message.includes('Proxy'))).toBe(true);
  });

  it('should not flag safe code', () => {
    const project = new Project({ useInMemoryFileSystem: true });
    const sourceFile = project.createSourceFile('test.ts', `
      export function add(a: number, b: number): number {
        return a + b;
      }
    `);

    const detector = new PatternDetector();
    const warnings = detector.detect(sourceFile, 'test.ts');

    expect(warnings.length).toBe(0);
  });
});
```

#### 2.3.2 Implement Pattern Detector
`src/parser/pattern-detector.ts`:
```typescript
import { SourceFile, SyntaxKind } from 'ts-morph';
import { ParseError } from '../types';

const DYNAMIC_PATTERNS = [
  { pattern: /\beval\s*\(/, message: 'eval() reduces static resolvability' },
  { pattern: /\bnew\s+Function\s*\(/, message: 'Function constructor reduces static resolvability' },
  { pattern: /\bnew\s+Proxy\s*\(/, message: 'Proxy usage may obscure property access' },
  { pattern: /\bReflect\.(get|set|has)\b/, message: 'Reflect API may obscure access patterns' },
  { pattern: /\[.*\]\s*=/, message: 'Bracket notation on unknown object reduces resolvability' }
];

export class PatternDetector {
  detect(sourceFile: SourceFile, filePath: string): ParseError[] {
    const warnings: ParseError[] = [];
    const text = sourceFile.getFullText();

    // Check for dynamic patterns
    for (const { pattern, message } of DYNAMIC_PATTERNS) {
      if (pattern.test(text)) {
        warnings.push({
          filePath,
          message: `Dynamic pattern detected: ${message}`,
          severity: 'warning'
        });
      }
    }

    // Check for dynamic imports
    sourceFile.forEachDescendant(node => {
      if (node.getKind() === SyntaxKind.ImportKeyword) {
        const parent = node.getParent();
        if (parent && parent.getKind() === SyntaxKind.CallExpression) {
          warnings.push({
            filePath,
            message: 'Dynamic import() detected - may reduce static resolvability',
            severity: 'warning'
          });
        }
      }
    });

    return warnings;
  }
}
```

### Step 2.4: Auxiliary Readers (TDD, ~0.5 days)

Implement simplified aux readers for tests and config (OpenAPI/SQL deferred to Phase 6):

`src/parser/aux-readers/test-reader.ts`:
```typescript
import { SourceFile } from 'ts-morph';
import { FactSet, Fact } from '../../types';

export class TestReader {
  extractFacts(sourceFile: SourceFile, filePath: string): FactSet[] {
    const factSets: FactSet[] = [];
    const facts: Fact[] = [];

    // Extract test names from describe/it blocks
    sourceFile.forEachDescendant(node => {
      const text = node.getText();

      if (text.includes('describe(') || text.includes('it(') || text.includes('test(')) {
        const match = text.match(/['"`]([^'"`]+)['"`]/);
        if (match) {
          facts.push({
            subjectId: filePath,
            predicate: 'test-case',
            object: match[1]
          });
        }
      }
    });

    if (facts.length > 0) {
      factSets.push({
        id: `${filePath}-test-facts`,
        facts,
        sources: [{ kind: 'aux', file: filePath, reader: 'test-reader' }],
        evidenceScore: 70 // Medium confidence for test intent
      });
    }

    return factSets;
  }
}
```

### Step 2.5: Integration with KB (0.5 days)

**Note:** This step requires `kb.insertRelation()` to be implemented in Phase 1 KB API (currently marked as "deferred to Phase 2"). Agent 2 should coordinate with maintainers to add this method before beginning Step 2.5.

Update Parser to write to KB:
```typescript
import { KnowledgeBase } from '../kb/knowledge-base';

export class Parser {
  // ... existing code ...

  async parseAndStore(
    filePath: string,
    source: string,
    kb: KnowledgeBase
  ): Promise<ParseResult> {
    const result = await this.parse(filePath, source);

    // Store in KB
    kb.beginBatch();
    try {
      for (const entity of result.entities) {
        kb.insertEntity(entity);
      }
      for (const factSet of result.factSets) {
        kb.insertFactSet(factSet);
      }
      // FIX CRITICAL-1: Store relations (imports, exports, calls)
      for (const relation of result.relations) {
        kb.insertRelation(relation);
      }
      kb.commit();
    } catch (error) {
      kb.rollback();
      throw error;
    }

    return result;
  }
}
```

**Required KB API Addition (Phase 1 Backport):**

Add to `src/kb/knowledge-base.ts`:
```typescript
// In KBState interface:
interface KBState {
  // ... existing fields ...
  relations: Relation[]; // Already exists but unused in Phase 1
}

// New method:
insertRelation(relation: Relation): void {
  const state = this.getActiveState();
  state.relations.push(relation);
}

// New method:
getRelations(entityId?: string): Relation[] {
  const state = this.getActiveState();
  if (!entityId) {
    return [...state.relations];
  }
  return state.relations.filter(r => r.subjectId === entityId || r.objectId === entityId);
}
```

### Agent 2 Acceptance Criteria
- ✅ Parser handles TS/JS/JSX/TSX files
- ✅ Babel fallback works for edge syntax
- ✅ Fact extraction captures entities, relations, facts
- ✅ Side effects detected (I/O, network, DB, storage)
- ✅ JSDoc comments extracted
- ✅ Dynamic patterns flagged (eval, Proxy, dynamic imports)
- ✅ Test reader extracts test case names
- ✅ Parser writes to KB correctly
- ✅ Unit tests ≥80% branch coverage for parser module

---

## Agent 3: Spec Generator (WS-E) — ~3-4 agent-days

**CTS Reference:** CTS-03 (Spec Generator)

**Deliverables:**
1. Root spec.md generation (overview, architecture, conventions, index)
2. Per-directory spec.md generation (in-place)
3. Style kit (voice, tense, lexicon, format)
4. Anchor/QID allocation (stable IDs)
5. Template-based rendering (no LLM polish yet)

### Step 3.1: Markdown Renderer (TDD, ~1 day)

#### 3.1.1 Write Failing Tests First
`tests/unit/generator/markdown-renderer.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { MarkdownRenderer } from '../../../src/generator/markdown-renderer';
import { Entity } from '../../../src/types';

describe('Markdown Renderer', () => {
  it('should render entity as Markdown section', () => {
    const entity: Entity = {
      id: 'test-id',
      kind: 'function',
      name: 'fetchUser',
      path: 'src/api/users.ts',
      signature: 'fetchUser(id: string): Promise<User>',
      exported: true
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    expect(markdown).toContain('### fetchUser');
    expect(markdown).toContain('fetchUser(id: string): Promise<User>');
  });

  it('should include anchor for entity', () => {
    const entity: Entity = {
      id: 'anchor123',
      kind: 'function',
      name: 'fetchUser',
      path: 'src/api/users.ts'
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    expect(markdown).toContain('<a id="anchor123"></a>');
  });

  it('should render side effects', () => {
    const entity: Entity = {
      id: 'test-id',
      kind: 'function',
      name: 'saveUser',
      path: 'src/api/users.ts',
      attributes: {
        sideEffects: ['network', 'database']
      }
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    expect(markdown).toContain('**Side effects:**');
    expect(markdown).toContain('network');
    expect(markdown).toContain('database');
  });

  it('should use style kit lexicon', () => {
    const entity: Entity = {
      id: 'test-id',
      kind: 'function',
      name: 'validateInput',
      path: 'src/validation.ts'
    };

    const renderer = new MarkdownRenderer();
    const markdown = renderer.renderEntity(entity);

    // Should use "validates" (active voice, present tense)
    expect(markdown.toLowerCase()).toContain('validate');
  });
});
```

#### 3.1.2 Implement Markdown Renderer
`src/generator/markdown-renderer.ts`:
```typescript
import { Entity, BehaviorChunk } from '../types';

export class MarkdownRenderer {
  renderEntity(entity: Entity, chunks?: BehaviorChunk[]): string {
    let md = '';

    // Anchor
    md += `<a id="${entity.id}"></a>\n\n`;

    // Heading
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
    } else {
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

  private generateTemplateProse(entity: Entity): string {
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

  private inferPurpose(name: string): string {
    // Simple heuristics for template prose
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

    return 'performs an operation';
  }

  private humanizeName(name: string): string {
    // Convert camelCase/PascalCase to human-readable
    return name.replace(/([A-Z])/g, ' $1').trim().toLowerCase();
  }
}
```

### Step 3.2: Spec Generator (TDD, ~1.5 days)

#### 3.2.1 Write Failing Tests First
`tests/unit/generator/spec-generator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { SpecGenerator } from '../../../src/generator/spec-generator';
import { KnowledgeBase } from '../../../src/kb/knowledge-base';

describe('Spec Generator', () => {
  it('should generate root spec.md', () => {
    const kb = new KnowledgeBase();
    kb.insertEntity({
      id: 'e1',
      kind: 'function',
      name: 'fetchUser',
      path: 'src/api/users.ts',
      exported: true
    });

    const generator = new SpecGenerator(kb);
    const rootSpec = generator.generateRootSpec('/project/root');

    expect(rootSpec).toContain('# Project Specification');
    expect(rootSpec).toContain('## System Overview');
    expect(rootSpec).toContain('## Index');
  });

  it('should generate per-directory specs', () => {
    const kb = new KnowledgeBase();
    kb.insertEntity({
      id: 'e1',
      kind: 'function',
      name: 'fetchUser',
      path: 'src/api/users.ts',
      exported: true
    });

    const generator = new SpecGenerator(kb);
    const dirSpecs = generator.generateDirectorySpecs('/project/root');

    expect(dirSpecs).toHaveProperty('src/api/spec.md');
    expect(dirSpecs['src/api/spec.md']).toContain('# src/api');
    expect(dirSpecs['src/api/spec.md']).toContain('### fetchUser');
  });

  it('should group entities by directory', () => {
    const kb = new KnowledgeBase();
    kb.insertEntity({
      id: 'e1',
      kind: 'function',
      name: 'foo',
      path: 'src/utils/foo.ts'
    });
    kb.insertEntity({
      id: 'e2',
      kind: 'function',
      name: 'bar',
      path: 'src/utils/bar.ts'
    });

    const generator = new SpecGenerator(kb);
    const dirSpecs = generator.generateDirectorySpecs('/project/root');

    expect(dirSpecs['src/utils/spec.md']).toContain('foo');
    expect(dirSpecs['src/utils/spec.md']).toContain('bar');
  });

  it('should include style kit conventions in root spec', () => {
    const kb = new KnowledgeBase();
    const generator = new SpecGenerator(kb);
    const rootSpec = generator.generateRootSpec('/project/root');

    expect(rootSpec).toContain('## Conventions');
    expect(rootSpec).toContain('Confidence bands');
    expect(rootSpec).toContain('Open Questions');
  });
});
```

#### 3.2.2 Implement Spec Generator
`src/generator/spec-generator.ts`:
```typescript
import * as path from 'path';
import { KnowledgeBase } from '../kb/knowledge-base';
import { MarkdownRenderer } from './markdown-renderer';
import { Entity } from '../types';

export class SpecGenerator {
  private renderer: MarkdownRenderer;

  constructor(private kb: KnowledgeBase) {
    this.renderer = new MarkdownRenderer();
  }

  generateRootSpec(projectRoot: string): string {
    let md = '';

    // Title
    const projectName = path.basename(projectRoot);
    md += `# ${projectName} — Specification\n\n`;
    md += `**Generated by ceps** (${new Date().toISOString().split('T')[0]})\n\n`;
    md += '---\n\n';

    // System Overview
    md += '## System Overview\n\n';
    const exported = this.kb.listExported();
    md += `This project contains ${exported.length} exported entities.\n\n`;

    // Conventions
    md += '## Conventions\n\n';
    md += '### Confidence Bands\n\n';
    md += '- **High (≥70):** Assertive prose based on strong evidence\n';
    md += '- **Medium (40-69):** Assertive prose with optional *Assumptions*\n';
    md += '- **Low (<40):** **Open Question** with QID (never asserted)\n\n';

    md += '### Open Questions\n\n';
    md += 'Items marked with **QID** (e.g., `q:a1b2c3d4e5`) indicate unresolved ambiguities.\n\n';

    // Index
    md += '## Index\n\n';
    md += 'Per-directory specifications:\n\n';

    const directories = this.getDirectories();
    for (const dir of directories) {
      md += `- [${dir}](./${dir}/spec.md)\n`;
    }
    md += '\n';

    return md;
  }

  generateDirectorySpecs(projectRoot: string): Record<string, string> {
    const specs: Record<string, string> = {};
    const directories = this.getDirectories();

    for (const dir of directories) {
      const entities = this.kb.findByPath(dir);

      if (entities.length === 0) continue;

      let md = '';
      md += `# ${dir}\n\n`;
      md += `**Directory Overview:** This directory contains ${entities.length} entities.\n\n`;

      // Group by file
      const byFile = this.groupByFile(entities);

      for (const [file, fileEntities] of Object.entries(byFile)) {
        md += `## ${path.basename(file)}\n\n`;

        for (const entity of fileEntities) {
          md += this.renderer.renderEntity(entity);
        }
      }

      specs[`${dir}/spec.md`] = md;
    }

    return specs;
  }

  private getDirectories(): string[] {
    const dirs = new Set<string>();
    const exported = this.kb.listExported();

    for (const entity of exported) {
      const dir = path.dirname(entity.path);
      dirs.add(dir);
    }

    return Array.from(dirs).sort();
  }

  private groupByFile(entities: Entity[]): Record<string, Entity[]> {
    const grouped: Record<string, Entity[]> = {};

    for (const entity of entities) {
      if (!grouped[entity.path]) {
        grouped[entity.path] = [];
      }
      grouped[entity.path].push(entity);
    }

    return grouped;
  }
}
```

### Step 3.3: Monorepo Spec Generation Strategy (TDD, ~0.5 days)

**Goal:** Handle monorepo packages with per-package specs and cross-package references.

#### 3.3.1 Write Failing Tests First
`tests/unit/generator/spec-generator.test.ts` (add to existing):
```typescript
describe('Monorepo Spec Generation', () => {
  it('should generate per-package specs for monorepos', () => {
    const kb = new KnowledgeBase();

    // Add entities from different packages
    kb.insertEntity({
      id: 'e1',
      kind: 'function',
      name: 'foo',
      path: 'packages/core/src/foo.ts',
      packageId: '@myapp/core',
      exported: true
    });
    kb.insertEntity({
      id: 'e2',
      kind: 'function',
      name: 'bar',
      path: 'packages/utils/src/bar.ts',
      packageId: '@myapp/utils',
      exported: true
    });

    const fileIndex: FileIndex = {
      entries: [],
      packages: {
        packages: [
          { id: '@myapp/core', name: '@myapp/core', path: 'packages/core', files: [] },
          { id: '@myapp/utils', name: '@myapp/utils', path: 'packages/utils', files: [] }
        ]
      },
      rootPath: '/project'
    };

    const generator = new SpecGenerator(kb, fileIndex);
    const dirSpecs = generator.generateDirectorySpecs('/project');

    // Should generate package-level specs
    expect(dirSpecs).toHaveProperty('packages/core/spec.md');
    expect(dirSpecs).toHaveProperty('packages/utils/spec.md');
    expect(dirSpecs['packages/core/spec.md']).toContain('foo');
    expect(dirSpecs['packages/utils/spec.md']).toContain('bar');
  });

  it('should include package metadata in monorepo root spec', () => {
    const kb = new KnowledgeBase();
    const fileIndex: FileIndex = {
      entries: [],
      packages: {
        packages: [
          { id: '@myapp/core', name: '@myapp/core', path: 'packages/core', files: [] },
          { id: '@myapp/utils', name: '@myapp/utils', path: 'packages/utils', files: [] }
        ]
      },
      rootPath: '/project'
    };

    const generator = new SpecGenerator(kb, fileIndex);
    const rootSpec = generator.generateRootSpec('/project');

    expect(rootSpec).toContain('## Packages');
    expect(rootSpec).toContain('@myapp/core');
    expect(rootSpec).toContain('@myapp/utils');
  });
});
```

#### 3.3.2 Update Spec Generator for Monorepos

**⚠️ IMPORTANT (v1.2):** This step **modifies** the SpecGenerator class from Step 3.2.2. The constructor signature changes from:
- `constructor(kb: KnowledgeBase)` → `constructor(kb: KnowledgeBase, fileIndex?: FileIndex)`

**Agents should either:**
1. Implement Steps 3.2 and 3.3 together from the start (recommended), OR
2. Refactor the constructor after completing Step 3.2

**All subsequent code in this plan uses the updated signature** (including Section 3.4, Section 2.5, and the smoke test).

`src/generator/spec-generator.ts`:
```typescript
import { FileIndex } from '../types';

export class SpecGenerator {
  private renderer: MarkdownRenderer;
  private fileIndex?: FileIndex;

  constructor(private kb: KnowledgeBase, fileIndex?: FileIndex) {
    this.renderer = new MarkdownRenderer();
    this.fileIndex = fileIndex;
  }

  generateRootSpec(projectRoot: string): string {
    let md = '';

    // Title
    const projectName = path.basename(projectRoot);
    md += `# ${projectName} — Specification\n\n`;
    md += `**Generated by ceps** (${new Date().toISOString().split('T')[0]})\n\n`;
    md += '---\n\n';

    // System Overview
    md += '## System Overview\n\n';
    const exported = this.kb.listExported();
    md += `This project contains ${exported.length} exported entities.\n\n`;

    // FIX HIGH-3: Add Packages section for monorepos
    if (this.fileIndex?.packages.packages && this.fileIndex.packages.packages.length > 0) {
      md += '## Packages\n\n';
      md += 'This monorepo contains the following packages:\n\n';
      for (const pkg of this.fileIndex.packages.packages) {
        md += `- **${pkg.name}** — [${pkg.path}/spec.md](./${pkg.path}/spec.md)\n`;
      }
      md += '\n';
    }

    // ... rest of root spec generation ...

    return md;
  }

  generateDirectorySpecs(projectRoot: string): Record<string, string> {
    const specs: Record<string, string> = {};

    // FIX HIGH-3: Generate per-package specs for monorepos
    if (this.fileIndex?.packages.packages && this.fileIndex.packages.packages.length > 0) {
      for (const pkg of this.fileIndex.packages.packages) {
        const pkgEntities = this.kb.listExported().filter(e => e.packageId === pkg.id);

        if (pkgEntities.length === 0) continue;

        let md = '';
        md += `# ${pkg.name}\n\n`;
        md += `**Package:** ${pkg.path}\n\n`;
        md += `**Exported entities:** ${pkgEntities.length}\n\n`;

        // Group by file within package
        const byFile = this.groupByFile(pkgEntities);

        for (const [file, fileEntities] of Object.entries(byFile)) {
          md += `## ${path.basename(file)}\n\n`;

          for (const entity of fileEntities) {
            md += this.renderer.renderEntity(entity);
          }
        }

        specs[`${pkg.path}/spec.md`] = md;
      }
    } else {
      // Non-monorepo: per-directory specs (original logic)
      const directories = this.getDirectories();

      for (const dir of directories) {
        const entities = this.kb.findByPath(dir);

        if (entities.length === 0) continue;

        let md = '';
        md += `# ${dir}\n\n`;
        md += `**Directory Overview:** This directory contains ${entities.length} entities.\n\n`;

        const byFile = this.groupByFile(entities);

        for (const [file, fileEntities] of Object.entries(byFile)) {
          md += `## ${path.basename(file)}\n\n`;

          for (const entity of fileEntities) {
            md += this.renderer.renderEntity(entity);
          }
        }

        specs[`${dir}/spec.md`] = md;
      }
    }

    return specs;
  }

  // ... rest of methods unchanged ...
}
```

### Step 3.4: Style Kit (0.5 days)

`src/generator/style-kit.ts`:
```typescript
export const STYLE_KIT = {
  version: 'ceps-style-1.0',

  voice: 'active',
  tense: 'present',

  lexicon: {
    // Canonical verbs (behavior-first)
    action: ['validates', 'computes', 'transforms', 'emits', 'persists', 'fetches', 'authorizes', 'schedules', 'retries', 'caches'],

    // Avoid these synonyms (use canonical instead)
    avoid: ['gets', 'sets', 'does', 'makes', 'uses']
  },

  format: {
    headingStyle: 'atx', // Use # headings, not underline
    bulletStyle: '-',    // Use - for bullets
    codeStyle: 'fenced'  // Use ``` fences, not indentation
  }
};

export function normalizeText(text: string): string {
  // Apply style kit transformations
  let normalized = text;

  // Replace common passive constructions
  normalized = normalized.replace(/is validated/g, 'validates');
  normalized = normalized.replace(/is computed/g, 'computes');

  return normalized;
}
```

### Step 3.4: Integration with Orchestrator (0.5 days)

**FIX MEDIUM-B (v1.2):** The full orchestrator integration is shown in **Section 2.5 (Consolidated Orchestrator Pipeline)**, which includes monorepo support.

For quick reference, the Generator integration requires passing the FileIndex to support monorepo spec generation:

```typescript
// FIX MEDIUM-B: SpecGenerator requires fileIndex for monorepo support
const generator = new SpecGenerator(kb, fileIndex);
```

See Section 2.5 for the complete updated `run()` function with all Phase 2 components integrated.

### Agent 3 Acceptance Criteria
- ✅ Root spec.md generated with all required sections
- ✅ Per-directory spec.md generated in-place
- ✅ Style kit applied (voice, tense, format)
- ✅ Anchors allocated for all entities
- ✅ Template prose is readable and follows behavior-first approach
- ✅ Unit tests ≥80% branch coverage for generator module

---

## Agent 4: LLM Gateway (WS-F) — ~4 agent-days

**CTS Reference:** CTS-02 §2-4 (LLM Gateway, Provider Adapters, Cache/Budget)

**Deliverables:**
1. Provider-agnostic gateway interface
2. **Working** Anthropic/OpenAI/Local provider adapters (full implementation)
3. Caching infrastructure (file-based for Phase 2)
4. Budget tracking (token counting)
5. Configuration via environment variables

**FIX CRITICAL-2:** This is **NOT** a skeleton. Agent 4 will implement **full, working LLM provider adapters** ready for Phase 4 integration. The Grounding Validator is deferred to Phase 4, but the adapters must make real API calls.

**Why full implementation:** Phase 4 needs working LLM integration. Implementing now is easier to test incrementally and only adds ~1 day to Agent 4 timeline (3 → 4 days).

### Step 4.1: Gateway Interface (TDD, ~0.5 days)

#### 4.1.1 Write Failing Tests First
`tests/unit/llm/gateway.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { LLMGateway, LLMRequest, LLMResponse } from '../../../src/llm/gateway';

describe('LLM Gateway', () => {
  it('should accept a request and return a response', async () => {
    const gateway = new LLMGateway({ provider: 'mock' });

    const request: LLMRequest = {
      prompt: 'Summarize this function',
      context: { facts: ['fact1', 'fact2'] },
      maxTokens: 100,
      temperature: 0.3
    };

    const response = await gateway.complete(request);

    expect(response).toHaveProperty('text');
    expect(response).toHaveProperty('tokensUsed');
  });

  it('should track token usage', async () => {
    const gateway = new LLMGateway({ provider: 'mock' });

    await gateway.complete({ prompt: 'test', maxTokens: 50 });

    const usage = gateway.getUsage();
    expect(usage.totalTokens).toBeGreaterThan(0);
  });

  it('should enforce budget limits', async () => {
    const gateway = new LLMGateway({ provider: 'mock', budget: 100 });

    await gateway.complete({ prompt: 'test', maxTokens: 80 });

    // Next request should fail (exceeds budget)
    await expect(
      gateway.complete({ prompt: 'test2', maxTokens: 50 })
    ).rejects.toThrow('Budget exceeded');
  });
});
```

#### 4.1.2 Implement Gateway
`src/llm/gateway.ts`:
```typescript
import { AnthropicAdapter } from './adapters/anthropic';
import { OpenAIAdapter } from './adapters/openai';

export interface LLMRequest {
  prompt: string;
  context?: Record<string, any>;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  text: string;
  tokensUsed: number;
  cached?: boolean;
}

export interface LLMGatewayConfig {
  provider: 'anthropic' | 'openai' | 'local' | 'mock';
  model?: string;
  apiKey?: string;
  budget?: number; // Max tokens allowed
  cache?: boolean;
}

export class LLMGateway {
  private totalTokens = 0;
  private budget: number;
  private adapter: any; // AnthropicAdapter | OpenAIAdapter

  constructor(private config: LLMGatewayConfig) {
    this.budget = config.budget || Infinity;

    // FIX CRITICAL-2: Initialize real adapters
    switch (config.provider) {
      case 'anthropic':
        this.adapter = new AnthropicAdapter(config.apiKey || process.env.ANTHROPIC_API_KEY || '');
        break;
      case 'openai':
        this.adapter = new OpenAIAdapter(config.apiKey || process.env.OPENAI_API_KEY || '');
        break;
      case 'mock':
        this.adapter = null;
        break;
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    // Check budget
    const estimatedTokens = request.maxTokens || 1000;
    if (this.totalTokens + estimatedTokens > this.budget) {
      throw new Error('Budget exceeded');
    }

    // Mock implementation for tests
    if (this.config.provider === 'mock') {
      const response: LLMResponse = {
        text: 'Mock response',
        tokensUsed: 50
      };
      this.totalTokens += response.tokensUsed;
      return response;
    }

    // FIX CRITICAL-2: Call real provider adapters
    const response = await this.adapter.complete(request);
    this.totalTokens += response.tokensUsed;
    return response;
  }

  getUsage() {
    return {
      totalTokens: this.totalTokens,
      budget: this.budget,
      remaining: this.budget - this.totalTokens
    };
  }
}
```

### Step 4.2: Provider Adapters (TDD, ~1.5 days)

#### 4.2.1 Anthropic Adapter
`src/llm/adapters/anthropic.ts`:
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { LLMRequest, LLMResponse } from '../gateway';

export class AnthropicAdapter {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: request.maxTokens || 1024,
      temperature: request.temperature || 0.3,
      messages: [
        {
          role: 'user',
          content: request.prompt
        }
      ]
    });

    return {
      text: message.content[0].type === 'text' ? message.content[0].text : '',
      tokensUsed: message.usage.input_tokens + message.usage.output_tokens
    };
  }
}
```

#### 4.2.2 OpenAI Adapter
`src/llm/adapters/openai.ts`:
```typescript
import OpenAI from 'openai';
import { LLMRequest, LLMResponse } from '../gateway';

export class OpenAIAdapter {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const completion = await this.client.chat.completions.create({
      model: 'gpt-4',
      max_tokens: request.maxTokens || 1024,
      temperature: request.temperature || 0.3,
      messages: [
        {
          role: 'user',
          content: request.prompt
        }
      ]
    });

    return {
      text: completion.choices[0].message.content || '',
      tokensUsed: completion.usage?.total_tokens || 0
    };
  }
}
```

### Step 4.3: Cache Infrastructure (TDD, ~1 day)

#### 4.3.1 Write Failing Tests First
`tests/unit/llm/cache.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { LLMCache } from '../../../src/llm/cache';
import * as fs from 'fs';

describe('LLM Cache', () => {
  let cache: LLMCache;

  beforeEach(() => {
    cache = new LLMCache('/tmp/ceps-cache');
  });

  it('should cache responses by prompt hash', async () => {
    const prompt = 'test prompt';
    const response = { text: 'cached response', tokensUsed: 50 };

    await cache.set(prompt, response);
    const cached = await cache.get(prompt);

    expect(cached).toEqual(response);
  });

  it('should return null for cache miss', async () => {
    const result = await cache.get('nonexistent prompt');
    expect(result).toBeNull();
  });

  it('should invalidate cache on version change', async () => {
    const cache1 = new LLMCache('/tmp/ceps-cache', { version: 'v1' });
    await cache1.set('test', { text: 'v1', tokensUsed: 10 });

    const cache2 = new LLMCache('/tmp/ceps-cache', { version: 'v2' });
    const result = await cache2.get('test');

    expect(result).toBeNull(); // Version mismatch
  });
});
```

#### 4.3.2 Implement Cache
`src/llm/cache.ts`:
```typescript
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { LLMResponse } from './gateway';

export interface CacheOptions {
  version?: string;
}

export class LLMCache {
  private version: string;

  constructor(
    private cacheDir: string,
    options: CacheOptions = {}
  ) {
    this.version = options.version || 'ceps-style-1.0';
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  async get(prompt: string): Promise<LLMResponse | null> {
    const key = this.hashKey(prompt);
    const filePath = this.getFilePath(key);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Check version
    if (data.version !== this.version) {
      return null;
    }

    return data.response;
  }

  async set(prompt: string, response: LLMResponse): Promise<void> {
    const key = this.hashKey(prompt);
    const filePath = this.getFilePath(key);

    const data = {
      version: this.version,
      prompt,
      response,
      timestamp: Date.now()
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  private hashKey(prompt: string): string {
    return crypto.createHash('sha256').update(prompt + this.version).digest('hex');
  }

  private getFilePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }
}
```

### Agent 4 Acceptance Criteria
- ✅ Gateway interface defined and tested
- ✅ Anthropic adapter implemented (primary provider)
- ✅ OpenAI adapter implemented (secondary provider)
- ✅ Mock adapter for testing
- ✅ Cache infrastructure works (file-based)
- ✅ Budget tracking enforced
- ✅ Unit tests ≥80% branch coverage for LLM module

---

## 2.5) Consolidated Orchestrator Pipeline

**Note:** This section shows the full orchestrator after all 4 agents complete their work.

`src/orchestrator/index.ts` (complete Phase 2 version):
```typescript
import { parseArgs, validateArgs } from './cli';
import { Scanner } from '../scanner/scanner';
import { Parser } from '../parser/parser';
import { KnowledgeBase } from '../kb/knowledge-base';
import { SpecGenerator } from '../generator/spec-generator';
import * as fs from 'fs';
import * as path from 'path';

export async function run(argv: string[]): Promise<number> {
  try {
    const args = parseArgs(argv);
    validateArgs(args);

    console.log('ceps v0.2.0 (Phase 2)');
    console.log(`Project root: ${args.projectRoot}`);
    console.log('---');

    // Step 1: Scanner
    console.log('[1/4] Scanning files...');
    const scanner = new Scanner(args.projectRoot);
    const fileIndex = await scanner.scan();
    console.log(`  Found ${fileIndex.entries.length} files`);

    if (fileIndex.packages.packages.length > 0) {
      console.log(`  Detected monorepo with ${fileIndex.packages.packages.length} packages`);
    }

    // Step 2: Parser
    console.log('[2/4] Parsing and extracting facts...');
    const parser = new Parser();
    const kb = new KnowledgeBase();
    let parseErrors = 0;

    for (const entry of fileIndex.entries) {
      if (entry.kind === 'code') {
        try {
          const source = fs.readFileSync(entry.absolutePath, 'utf8');
          await parser.parseAndStore(entry.path, source, kb);
        } catch (error) {
          console.warn(`  Warning: Failed to parse ${entry.path}: ${(error as Error).message}`);
          parseErrors++;
        }
      }
    }

    const entities = kb.listExported();
    console.log(`  Extracted ${entities.length} exported entities`);

    if (parseErrors > 0) {
      const errorRate = (parseErrors / fileIndex.entries.length) * 100;
      console.warn(`  ${parseErrors} files failed to parse (${errorRate.toFixed(1)}%)`);

      if (errorRate > 10) {
        console.error(`  ERROR: >10% of files failed to parse. Check parser compatibility.`);
      }
    }

    // Step 3: Generate specs
    console.log('[3/4] Generating specifications...');
    const generator = new SpecGenerator(kb, fileIndex);

    const rootSpec = generator.generateRootSpec(args.projectRoot);
    fs.writeFileSync(path.join(args.projectRoot, 'spec.md'), rootSpec);

    const dirSpecs = generator.generateDirectorySpecs(args.projectRoot);
    for (const [specPath, content] of Object.entries(dirSpecs)) {
      const fullPath = path.join(args.projectRoot, specPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

    console.log(`  Generated ${Object.keys(dirSpecs).length + 1} spec files`);

    // Step 4: Summary
    console.log('[4/4] Complete!');
    console.log('---');
    console.log(`✅ Generated specs in ${args.projectRoot}`);
    console.log(`   - Root: spec.md`);
    console.log(`   - Directories: ${Object.keys(dirSpecs).length} files`);

    return 0;
  } catch (error) {
    console.error('ERROR:', (error as Error).message);
    return 1;
  }
}
```

---

## 2.6) Error Handling Strategy

**FIX MEDIUM-2:** This section defines how errors are handled throughout the pipeline.

### Parse Errors
- **Behavior:** Continue pipeline (fail gracefully)
- **Storage:** Log warnings to console; optionally store ParseError[] for run summary
- **Partial results:** Include entities/facts from successfully parsed files
- **Babel fallback:** If TypeScript compiler API fails, try Babel; if both fail, skip file

### Pipeline Behavior by Component

| Component | Error Type | Behavior | User Impact |
|-----------|-----------|----------|-------------|
| **Scanner** | File read error | Log warning, skip file, continue | Missing file in analysis |
| **Scanner** | Permission denied | Log warning, skip file, continue | Missing file in analysis |
| **Parser** | Parse error (syntax) | Try Babel fallback, then skip | Missing entities from file |
| **Parser** | Fact extraction error | Store partial facts, log warning | Incomplete facts for file |
| **Generator** | Template error | Fail fast (bug in generator) | Build fails |
| **Generator** | File write error | Fail fast (filesystem issue) | Build fails |
| **LLM Gateway** | API error | Log error, skip LLM polish (Phase 4) | Template prose used |
| **LLM Gateway** | Budget exceeded | Throw error, stop pipeline | User must increase budget |

### User-Facing Error Reporting

**Run Summary (at end):**
```
✅ Generated specs in /project
   - Root: spec.md
   - Directories: 5 files

⚠️  Warnings:
   - 3 files failed to parse (2.1%)
     - src/legacy/old.js: Syntax error at line 45
     - src/vendor/bundle.min.js: File too large (>1MB)
     - src/generated/proto.ts: Unsupported syntax

💡 Tip: Check parser compatibility or add files to ignore rules
```

**Error Threshold:**
- If >10% of files fail to parse, emit warning suggesting parser issues
- If >25% of files fail, recommend checking ignore rules (likely including bundled/minified files)

---

## 3) Integration & Coordination

### Step 3.1: Agent Coordination (Day 1)

**Critical:** All agents must coordinate on shared interfaces before implementation.

**Day 1 Kickoff Meeting Agenda:**
1. Review Phase 1 completion status
2. Agree on shared type definitions (FileIndex, FileEntry, ParseResult)
3. Assign agents to workstreams
4. Set daily standup time (optional but recommended)
5. Define integration points

**Shared Types Agreement (commit to repo before agents start):**
```typescript
// src/types/index.ts (Phase 2 additions)

export interface FileEntry {
  path: string;
  absolutePath: string;
  kind: 'code' | 'test' | 'config' | 'contract';
  packageId?: string;
  size: number;
}

export interface FileIndex {
  entries: FileEntry[];
  packages: PackageMap;
  rootPath: string;
}

export interface ParseResult {
  filePath: string;
  entities: Entity[];
  relations: Relation[];
  factSets: FactSet[];
  errors: ParseError[];
}
```

### Step 3.2: End-to-End Smoke Test (Integration Test)

**Goal:** Verify Scanner → Parser → KB → Generator pipeline works end-to-end.

`tests/integration/phase2-smoke.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { Scanner } from '../../src/scanner/scanner';
import { Parser } from '../../src/parser/parser';
import { KnowledgeBase } from '../../src/kb/knowledge-base';
import { SpecGenerator } from '../../src/generator/spec-generator';
import * as fs from 'fs';
import * as path from 'path';

describe('Phase 2 End-to-End Smoke Test', () => {
  it('should scan → parse → store → generate specs', async () => {
    // Use a fixture project
    const fixturePath = path.join(__dirname, '../fixtures/tiny-express');

    // Step 1: Scanner
    const scanner = new Scanner(fixturePath);
    const fileIndex = await scanner.scan();

    expect(fileIndex.entries.length).toBeGreaterThan(0);

    // Step 2: Parser
    const parser = new Parser();
    const kb = new KnowledgeBase();

    for (const entry of fileIndex.entries) {
      if (entry.kind === 'code') {
        const source = fs.readFileSync(entry.absolutePath, 'utf8');
        await parser.parseAndStore(entry.path, source, kb);
      }
    }

    const entities = kb.listExported();
    expect(entities.length).toBeGreaterThan(0);

    // Step 3: Generator
    // FIX MEDIUM-B (v1.2): Pass fileIndex for monorepo support
    const generator = new SpecGenerator(kb, fileIndex);
    const rootSpec = generator.generateRootSpec(fixturePath);

    expect(rootSpec).toContain('# tiny-express');
    expect(rootSpec).toContain('## System Overview');

    const dirSpecs = generator.generateDirectorySpecs(fixturePath);
    expect(Object.keys(dirSpecs).length).toBeGreaterThan(0);
  });
});
```

**Fixture Project Structure:**
```
tests/fixtures/tiny-express/
├── package.json
├── src/
│   ├── index.ts
│   └── routes/
│       └── users.ts
```

**FIX MEDIUM-3: Expanded fixture to exercise more parser features**

**Fixture: `src/index.ts`**
```typescript
import express from 'express';
import { userRoutes } from './routes/users';
import { connectDatabase } from './db/connection';

/**
 * Creates and configures the Express application
 * @returns Configured Express app
 */
export async function createApp() {
  const app = express();

  // Connect to database (side effect)
  await connectDatabase();

  app.use('/users', userRoutes);

  return app;
}
```

**Fixture: `src/routes/users.ts`**
```typescript
import { Router } from 'express';
import { getUserById, createUser } from '../services/users';

export const userRoutes = Router();

/**
 * Get user by ID
 * Fetches user data from database
 */
userRoutes.get('/:id', async (req, res) => {
  try {
    const user = await getUserById(req.params.id); // Call relation
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: 'User not found' });
  }
});

/**
 * Create a new user
 * @throws {ValidationError} If user data is invalid
 */
userRoutes.post('/', async (req, res) => {
  try {
    const user = await createUser(req.body); // Call relation
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: 'Invalid user data' });
  }
});
```

**Fixture: `src/services/users.ts`**
```typescript
import { db } from '../db/connection';

export interface User {
  id: string;
  name: string;
  email: string;
}

/**
 * Fetches a user by ID from the database
 * @param id - User ID
 * @returns User object
 * @throws {Error} If user not found
 */
export async function getUserById(id: string): Promise<User> {
  // Side effects: database read
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);

  if (!user) {
    throw new Error('User not found');
  }

  return user;
}

/**
 * Creates a new user in the database
 * @param userData - User data to create
 * @returns Created user
 */
export async function createUser(userData: Partial<User>): Promise<User> {
  // Side effects: database write, network (if db is remote)
  const result = await db.insert('users', userData);
  return result;
}
```

**Fixture: `src/db/connection.ts`**
```typescript
/**
 * Connects to the database
 * Side effects: network, database connection
 */
export async function connectDatabase(): Promise<void> {
  // Dynamic import example
  const config = await import('./config.json');

  // Network side effect
  console.log('Connecting to database...');
}

export const db = {
  query: async (sql: string, params: any[]) => {
    // Stub for fixture
  },
  insert: async (table: string, data: any) => {
    // Stub for fixture
  }
};
```

**What this fixture exercises:**
- ✅ JSDoc comments
- ✅ Function signatures with types
- ✅ Side effects (database, network, console)
- ✅ Error handling (try/catch, throws)
- ✅ Import/export relations
- ✅ Call relations (getUserById called from route)
- ✅ Dynamic imports
- ✅ Complex types (interfaces)

---

## 4) Acceptance Criteria (Phase 2 Checkpoint)

Before marking Phase 2 complete and proceeding to Phase 3, verify:

### 4.1 Scanner & Loader (Agent 1)
- ✅ File discovery works with ignore rules
- ✅ Monorepo detection works (pnpm/Lerna/Nx/Yarn)
- ✅ File classification accurate (code/test/config/contract)
- ✅ FileIndex has deterministic ordering
- ✅ Integration with orchestrator works
- ✅ Unit tests ≥80% coverage

### 4.2 Parser & Patterns (Agent 2)
- ✅ TypeScript compiler API parser works
- ✅ Babel fallback works for edge syntax
- ✅ Fact extraction captures entities, relations, facts
- ✅ Side effects detected (I/O, network, DB, storage)
- ✅ Dynamic patterns flagged
- ✅ Test reader extracts test case names
- ✅ Parser writes to KB correctly
- ✅ Unit tests ≥80% coverage

### 4.3 Spec Generator (Agent 3)
- ✅ Root spec.md generated with all sections (including Packages section for monorepos)
- ✅ Per-directory or per-package spec.md generated in-place
- ✅ Monorepo support works (per-package specs)
- ✅ Style kit applied
- ✅ Anchors allocated
- ✅ Template prose readable
- ✅ Unit tests ≥80% coverage for generator module

### 4.4 LLM Gateway (Agent 4)
- ✅ Gateway interface defined
- ✅ Anthropic adapter works (with real API key or mock)
- ✅ OpenAI adapter works (with real API key or mock)
- ✅ Cache infrastructure works (file-based)
- ✅ Budget tracking works
- ✅ Unit tests ≥80% coverage for LLM module

### 4.5 Integration
- ✅ End-to-end smoke test passes (expanded fixture with JSDoc, side effects, calls, errors)
- ✅ Scanner → Parser (with relations) → KB → Generator pipeline works
- ✅ All CI checks pass (lint, typecheck, test, coverage)
- ✅ **FIX MEDIUM-4:** Coverage target ≥80% branch coverage for **Phase 2 modules only** (Scanner, Parser, Generator templates, LLM Gateway) — NOT WS-A (done in Phase 1), WS-D (Phase 3), WS-G (Phase 5), WS-H full (Phase 3+)

---

## 5) Estimated Timeline

**Total effort:** ~15-19 agent-days (4 agents working 3-5 days each in parallel)

| Agent | Workstream | Estimated Time | Critical Path | Notes |
|-------|-----------|----------------|---------------|-------|
| **Agent 1** | Scanner & Loader | ~3 days | No | Can start immediately |
| **Agent 2** | Parser & Patterns | ~5 days | **YES** | Most complex; call extraction added (was 4 days) |
| **Agent 3** | Spec Generator | ~4 days | No | Monorepo support added (+0.5 days) |
| **Agent 4** | LLM Gateway | ~4 days | No | Full adapters (was 3 days for skeleton) |

**FIX HIGH-1 & SUGGESTION-3:** Timeline updated to reflect:
1. Agent 2 increased from 4 to 5 days (call relation extraction + comprehensive fact extraction)
2. Agent 3 increased from 3-4 to 4 days (monorepo spec generation)
3. Agent 4 increased from 3 to 4 days (full implementation vs skeleton)
4. Buffer days added for integration issues

**Critical path:** Agent 2 (Parser) blocks end-to-end smoke test. If Agent 2 runs late, Agent 1 or Agent 4 can help with auxiliary readers or additional testing.

**Recommended schedule:**
- **Day 1:** Kickoff meeting, agree on interfaces, all agents start implementation
- **Days 2-4:** Independent implementation with TDD
- **Day 5:** Agent 2 continues; Agents 1, 3, 4 finish and begin integration
- **Day 6:** Integration test, bug fixes, smoke test
- **Day 7:** Buffer for unexpected issues

**Completion target:** ~5-7 calendar days with 4 agents working in parallel (conservative estimate with buffer).

---

## 6) Success Criteria

Phase 2 is **complete** when:

1. ✅ **All unit tests pass** with ≥80% branch coverage for Scanner, Parser, Generator, LLM modules
2. ✅ **End-to-end smoke test passes** (scan → parse → KB → generate)
3. ✅ **CI pipeline runs successfully** on every commit
4. ✅ **All 4 agents have completed their workstreams**
5. ✅ **Integration with orchestrator works** (can run `pnpm start <project>` and generate specs)
6. ✅ **No critical bugs remain** (warnings acceptable if documented)

**Next step:** Proceed to Phase 3 (Indices, Reasoning, Linking) with 2-3 parallel agents.

---

## 7) Tips for Agents Implementing Phase 2

1. **Coordinate early.** Day 1 interface agreement is critical for parallel work.
2. **Use fixtures.** Create small test fixtures (tiny-express, tiny-react) to validate end-to-end.
3. **Mock external dependencies.** LLM Gateway should use mock provider for tests (no real API calls).
4. **Test incrementally.** Run tests after every small change.
5. **Commit frequently.** Each feature should be a separate commit with tests.
6. **Document assumptions.** If you make a design decision, add a comment explaining why.
7. **Ask for help early.** If blocked on another agent's interface, flag immediately.
8. **Use golden tests.** For Generator, commit expected Markdown outputs and diff against them.
9. **Handle errors gracefully.** Parser should not crash on malformed code; log errors and continue.
10. **Optimize later.** Phase 2 is about correctness, not performance. Defer optimization to Phase 6.

---

## 8) Deferred Work (Phase 3+)

### 8.1 Phase 3 (Intelligence)
- **Confidence scoring algorithm** (CTS-01 §3)
- **Graph indices** (callGraph, importGraph, reverseDeps)
- **Reasoning & Ambiguity Resolver** (CTS-06)
- **Two-phase cross-link validation** (CTS-03 §5.2)
- **Orchestrator phase coordination**

### 8.2 Phase 4 (Grounding & Polish)
- **Grounding Validator** (CTS-02 §6)
- **LLM integration with Spec Generator** (polishing template prose)
- **Quality gates enforcement** (CTS-07 §6)

### 8.3 Phase 5 (Finalization)
- **Finalization Engine** (CTS-04)
- **Snapshot/Merkle tree**
- **Answer-guided re-analysis**

### 8.4 Phase 6 (Production Hardening)
- **Framework patterns** (Express, React, Redux, GraphQL, HTTP)
- **Performance optimization** (worker pools, memory)
- **OpenAPI/SQL auxiliary readers**

---

---

## 9) Summary of Changes (v1.0 → v1.1)

**This section documents all fixes applied based on feedback review.**

### CRITICAL Issues Fixed

✅ **CRITICAL-1: Relation Storage** (Parser Integration)
- Added `kb.insertRelation()` calls in `parseAndStore()` method
- Added required KB API methods: `insertRelation()` and `getRelations()`
- Relations (imports, exports, calls) now properly stored in KB

✅ **CRITICAL-2: LLM Gateway Scope Clarification**
- Changed from "skeleton" to **full working implementation**
- Gateway now initializes real provider adapters (Anthropic/OpenAI)
- `complete()` method makes real API calls (not throwing "not implemented")
- Timeline updated: Agent 4 increased from 3 to 4 days
- Acceptance criteria clarified: "works with real API key or mock"

### HIGH Priority Issues Fixed

✅ **HIGH-1: Agent 2 Timeline** (Increased from 4 to 5 days)
- Added note that Parser is most complex workstream
- Timeline increased to account for call extraction + comprehensive fact extraction
- Overall timeline updated: 4-5 days → 5-7 days with buffer

✅ **HIGH-2: Call Graph Relations** (Added to Fact Extractor)
- Fact extractor now extracts **call relations** (function calls, method calls)
- Added code to detect CallExpression nodes and create call relations
- Relations include: caller entity ID → callee expression
- Note added that Phase 3 will resolve callees to entity IDs

✅ **HIGH-3: Monorepo Spec Generation** (Added Strategy)
- SpecGenerator now accepts FileIndex parameter
- Added per-package spec generation for monorepos
- Root spec includes "Packages" section for monorepos
- Non-monorepo projects still use per-directory specs
- Tests added for monorepo spec generation

### MEDIUM Priority Issues Fixed

✅ **MEDIUM-1: Anchor Generation Signature** (Fixed)
- Changed from `generateAnchor(name, filePath)` to `generateAnchor(name, content, existingAnchors)`
- Now uses function body content (`func.getText()`) for content-based anchoring
- Anchors are now stable and content-based

✅ **MEDIUM-2: Error Handling Strategy** (Added Section 2.6)
- Comprehensive error handling strategy documented
- Pipeline behavior defined by component and error type
- User-facing error reporting specified (run summary with warnings)
- Error thresholds defined (>10% parse failures → warning)
- Orchestrator updated to implement error handling

✅ **MEDIUM-3: Smoke Test Fixture** (Expanded)
- Fixture expanded from minimal to comprehensive
- Now exercises: JSDoc, side effects, error handling, call relations, dynamic imports, complex types
- Added files: `src/services/users.ts`, `src/db/connection.ts`
- What this exercises list added for clarity

✅ **MEDIUM-4: Coverage Target** (Corrected)
- Fixed incorrect mention of "WS-A/B/C/D/E/F/G/H"
- Corrected to: **Phase 2 modules only** (Scanner, Parser, Generator, LLM Gateway)
- Explicitly excluded: WS-A (Phase 1 done), WS-D (Phase 3), WS-G (Phase 5), WS-H full (Phase 3+)

✅ **MEDIUM-5: TypeScript Magic Numbers** (Fixed)
- Changed from `target: 99, module: 99, jsx: 2` to proper enums
- Now uses: `ScriptTarget.ESNext`, `ModuleKind.ESNext`, `JsxEmit.React`
- Imports added from ts-morph for type safety

### Structural Improvements

✅ **SUGGESTION-1: Consolidated Orchestrator** (Added Section 2.5)
- Full orchestrator pipeline shown after all agents complete
- Shows integration of Scanner → Parser → KB → Generator
- Includes error handling implementation

✅ **SUGGESTION-2: Explicit "NOT in Phase 2" List** (Added)
- Clear list of deferred features with ❌ markers
- Helps agents understand scope boundaries
- Reduces ambiguity about what to implement

✅ **SUGGESTION-3: Timeline Buffer** (Added)
- Updated from 4-5 days to 5-7 days
- Buffer added for integration issues (Day 7)
- Conservative estimate based on Phase 1 experience

### Additional Improvements

- Added revision history to document header
- Updated "What Phase 2 delivers" to include clarifications (call relations, monorepo, full adapters)
- Updated "Critical checkpoint" to mention relations storage
- Added notes throughout code examples with "FIX" markers for traceability
- Timeline table now includes "Critical Path" and "Notes" columns
- Acceptance criteria expanded to include new features (call relations, monorepo, anchors)

---

## 10) Summary of Changes (v1.1 → v1.3)

**This section documents fixes applied based on FEEDBACK2 and FEEDBACK3 reviews.**

### v1.2 Changes (FEEDBACK2 Fixes)

✅ **MEDIUM-A: Duplicate Anchor Generation in Call Relations**
- **Location:** Step 2.2.2, lines 1044-1060
- **Fix:** Moved call relation extraction inside function loop
- **Result:** Now reuses entityId instead of generating new anchor
- **Impact:** Eliminates duplicate ID generation for same function
- **Note:** Added explanatory comment at line 1121

✅ **MEDIUM-B: Inconsistent SpecGenerator Instantiation**
- **Locations:** Sections 3.4, 3.2, 3.3.2
- **Fixes:**
  - Section 3.4: Updated to reference Section 2.5 for full orchestrator code (lines 2007-2014)
  - Section 3.2: Updated smoke test to pass fileIndex (lines 2595-2596)
  - Section 3.3.2: Added prominent warning note (lines 1865-1872)
- **Result:** All instantiations now use `new SpecGenerator(kb, fileIndex)`
- **Impact:** Consistent monorepo support throughout

✅ **MINOR-A: Constructor Signature Clarification**
- **Location:** Section 3.3.2, lines 1865-1872
- **Fix:** Added ⚠️ IMPORTANT warning explaining constructor changes between Steps 3.2 and 3.3
- **Result:** Agents understand they should implement both steps together or refactor
- **Impact:** Reduces confusion and rework during implementation

### v1.3 Changes (FEEDBACK3 Regression Fixes)

✅ **CRITICAL-3: Class and Method Anchor Generation Regression**
- **Location:** Step 2.2.2, lines 1067-1070 (classes), 1085-1088 (methods)
- **Issue:** v1.1 fixed function anchor generation but didn't update classes/methods
- **Fixes:**
  - Classes: Now use `generateAnchor(name, content, this.existingAnchors)` with content from `cls.getText()`
  - Methods: Now use `generateAnchor(name, methodContent, this.existingAnchors)` with content from `method.getText()`
  - Both: Now add generated ID to `this.existingAnchors` for collision tracking
- **Result:** All entity types (functions, classes, methods) use consistent content-based anchoring
- **Impact:** Stable anchors across all entity types; collision detection works correctly

✅ **CRITICAL-3b: Method Call Relations Not Extracted**
- **Location:** Step 2.2.2, lines 1100-1114
- **Issue:** v1.2 fixed function call extraction but didn't add equivalent for methods
- **Fix:** Added `method.forEachDescendant()` loop inside method extraction to capture call relations
- **Result:** Call relations now extracted for both functions and methods
- **Impact:** Complete call graph for OOP codebases; Phase 3 reasoning will work correctly

✅ **HIGH-4: Documentation Version Inconsistency**
- **Location:** Line 3005
- **Fix:** Updated ending from "v1.1" to "v1.3"
- **Result:** Document version consistent throughout

### Verification

- [x] All FEEDBACK2 issues addressed (v1.2)
- [x] All FEEDBACK3 issues addressed (v1.3)
- [x] No regressions introduced in v1.3 fixes
- [x] Class/method anchors consistent with function anchors
- [x] Call relations extracted for all entity types (functions, classes, methods)
- [x] Documentation version correct
- [x] Ready for agent execution

### Key Lessons

**From FEEDBACK3:** When refactoring similar code paths (functions, classes, methods), ensure fixes are applied consistently across all entity types. The v1.1 anchor fix was applied to functions but not classes/methods, creating a regression that was caught in FEEDBACK3.

**Best Practice:** For Agent 2, emphasize that **all entity types must use identical patterns** for:
1. Anchor generation: `generateAnchor(name, content, this.existingAnchors)`
2. Anchor tracking: `this.existingAnchors.add(entityId)`
3. Call extraction: `entity.forEachDescendant()` loop for CallExpression

---

**End of Phase 2 Plan v1.3**

*This plan follows TDD discipline, enables high parallelization (4 agents), and is aligned with IMPLEMENTATION_PLAN.md, SADS.md, and the CTS suite. All issues from FEEDBACK2 and FEEDBACK3 have been addressed. The plan is production-ready for agent assignment.*
