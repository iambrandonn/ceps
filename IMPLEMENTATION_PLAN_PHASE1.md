# ceps — Phase 1 Implementation Plan (Foundation) — v1.2

**Date:** 2025-11-03 (Revised after second review feedback)
**Phase:** Phase 1 — Foundation (Sequential)
**Scope:** Test infrastructure, minimal orchestrator, KB schema, ID generation, API contract freeze
**Dependencies:** None (this is the starting point)
**Estimated Effort:** ~4-6 agent-days
**Critical Path:** Everything in this phase is sequential and blocks Phase 2 work

**Revision History:**
- v1.0 (2025-11-03): Initial plan
- v1.1 (2025-11-03): Fixed 4 critical bugs, added missing API stubs, improved validation, added documentation standards
- v1.2 (2025-11-03): Fixed deep cloning for nested properties, corrected QID test logic, made allocateQID idempotent, improved comments

---

## 0) Phase 1 Overview

**Goal:** Establish the foundational contracts that enable parallel work in Phase 2.

**What Phase 1 delivers:**
1. **Test infrastructure** — CI pipeline, test framework, coverage enforcement, golden-test harness
2. **WS-H: Minimal orchestrator** — Bare CLI harness that can invoke components sequentially
3. **WS-A: KB schema** — All data models (Entity, Relation, Fact, FactSet, BehaviorChunk, KnowledgeBase)
4. **WS-A: ID generation** — Stable anchor/QID generation with collision handling
5. **WS-A: API contract** — Tested insert/update/query interfaces with **stub methods** for Phase 3 APIs
6. **Unit tests** — ≥80% branch coverage for all Phase 1 code

**What Phase 1 defers:**
- Confidence scoring algorithm (stubbed as "Medium" for now) → Phase 3
- Graph indices (callGraph, importGraph, reverseDeps) → Phase 3
- Relation insert/query (data structure in place; unused until Phase 2 Parser) → Phase 2
- Scanner, Parser, Generator → Phase 2

**Critical checkpoint:** **KB API Freeze** — No signature changes allowed after this checkpoint; all Phase 2 agents depend on this contract.

---

## 0.1) Phase 1 API Scope (Clarification)

**Fully implemented in Phase 1:**
- `insertEntity`, `updateEntity`, `getEntity`, `findByPath`, `listExported`
- `insertFactSet`, `getFactSet`
- `insertChunk`, `getChunk`
- `beginBatch`, `commit`, `rollback`
- Anchor/QID generation functions

**Stubbed in Phase 1 (implementation deferred to Phase 3):**
- `scoreConfidence` → Always returns "Medium"
- `neighbors` → Returns empty array
- `listOpenQuestions` → Returns empty array
- `computeAnchors` → No-op (anchors computed inline during entity insert in Phase 1)
- `allocateQID` → Wrapper around `generateQID` from id-generation
- `validateQIDUniqueness` → Checks against stored QIDs

**Deferred entirely (not in Phase 1 API):**
- `insertRelation`, `getRelations` → Phase 2 (when Parser extracts relations)
- `buildCallGraph`, `buildImportGraph`, `computeReverseDeps` → Phase 3

---

## 1) Prerequisites (Before Writing Code)

### 1.1 Repository Structure
```
ceps/
├── src/
│   ├── kb/              # Knowledge Base (WS-A)
│   │   ├── knowledge-base.ts
│   │   ├── models.ts
│   │   └── id-generation.ts
│   ├── orchestrator/    # Orchestrator (WS-H)
│   │   ├── index.ts
│   │   └── cli.ts
│   └── types/           # Shared TypeScript types
│       └── index.ts
├── tests/
│   ├── unit/
│   │   ├── kb/
│   │   │   ├── knowledge-base.test.ts
│   │   │   ├── models.test.ts
│   │   │   └── id-generation.test.ts
│   │   └── orchestrator/
│   │       └── cli.test.ts
│   ├── integration/
│   │   └── phase1-smoke.test.ts
│   └── helpers/         # Test utilities
├── docs/
│   └── API.md           # API documentation (Phase 1)
├── package.json
├── tsconfig.json
├── vitest.config.ts     # or jest.config.js
├── .eslintrc.js
├── .prettierrc
└── .github/
    └── workflows/
        └── ci.yml
```

### 1.2 Tooling Setup
Install and configure:
- **Node.js:** ≥ 18 LTS (recommend 20)
- **TypeScript:** 5.x
- **Package manager:** pnpm (preferred) or npm
- **Test framework:** Vitest (preferred) or Jest
- **Coverage:** c8 (Vitest native) or nyc (Jest)
- **Lint/format:** ESLint + Prettier
- **CI:** GitHub Actions with Node 18/20 matrix

### 1.3 CI Pipeline Configuration
Create `.github/workflows/ci.yml`:
```yaml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:unit
      - run: pnpm test:coverage
      # Golden tests and integration tests added in Phase 2+
```

### 1.4 Coverage Enforcement
Configure coverage thresholds in `vitest.config.ts` or `jest.config.js`:
```typescript
export default {
  coverage: {
    provider: 'c8', // or 'istanbul' for Jest
    reporter: ['text', 'lcov', 'html'],
    thresholds: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    exclude: [
      'tests/**',
      '**/*.test.ts',
      '**/*.spec.ts',
      'src/types/**'  // type-only files
    ]
  }
};
```

---

## 2) Step-by-Step Implementation (TDD Workflow)

### Step 1: Test Infrastructure Setup (Sequential, ~0.5 days)

**Tasks:**
1. Initialize repository with `package.json`, `tsconfig.json`
2. Install dependencies: TypeScript, Vitest/Jest, ESLint, Prettier
3. Configure test framework with TypeScript support
4. Configure coverage enforcement (≥80% threshold)
5. Set up CI pipeline (lint, typecheck, test, coverage)
6. Verify CI passes with a trivial "hello world" test

**Acceptance:**
- ✅ `pnpm test` runs successfully
- ✅ `pnpm test:coverage` enforces 80% threshold
- ✅ `pnpm lint` and `pnpm typecheck` pass
- ✅ CI pipeline runs on push and blocks merge on failure

**No code commits until this step is complete.**

---

### Step 2: WS-H — Minimal CLI Harness (TDD, ~0.5 days)

**Goal:** Create a bare CLI that can be invoked by integration tests later.

**TDD Workflow:**

#### 2.1 Write Failing Tests First
`tests/unit/orchestrator/cli.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { parseArgs, validateArgs } from '../../../src/orchestrator/cli';

describe('CLI Argument Parsing', () => {
  it('should parse project root from first positional argument', () => {
    const args = parseArgs(['node', 'ceps', '/path/to/project']);
    expect(args.projectRoot).toBe('/path/to/project');
  });

  it('should default to current directory if no argument provided', () => {
    const args = parseArgs(['node', 'ceps']);
    expect(args.projectRoot).toBe(process.cwd());
  });

  it('should parse --deterministic flag', () => {
    const args = parseArgs(['node', 'ceps', '.', '--deterministic']);
    expect(args.deterministic).toBe(true);
  });

  it('should parse --max-workers with value', () => {
    const args = parseArgs(['node', 'ceps', '.', '--max-workers', '4']);
    expect(args.maxWorkers).toBe(4);
  });

  it('should throw error for invalid --max-workers value', () => {
    expect(() => parseArgs(['node', 'ceps', '.', '--max-workers', 'abc']))
      .toThrow('--max-workers must be a positive integer');
  });

  it('should throw error if --max-workers has no value', () => {
    expect(() => parseArgs(['node', 'ceps', '.', '--max-workers']))
      .toThrow('--max-workers requires a value');
  });

  it('should validate that project root exists', () => {
    expect(() => validateArgs({ projectRoot: '/nonexistent/path' }))
      .toThrow('Project root does not exist');
  });

  it('should validate that project root is a directory', () => {
    // Create a temporary file (not directory) to test validation
    const tmpFile = '/tmp/ceps-test-file.txt';
    fs.writeFileSync(tmpFile, 'test');

    expect(() => validateArgs({ projectRoot: tmpFile }))
      .toThrow('Project root is not a directory');

    fs.unlinkSync(tmpFile);
  });
});
```

#### 2.2 Implement to Make Tests Pass
`src/orchestrator/cli.ts`:
```typescript
import * as fs from 'fs';
import * as path from 'path';

export interface CliArgs {
  projectRoot: string;
  deterministic?: boolean;
  maxWorkers?: number;
  detail?: 'spec-ready' | 'exhaustive' | 'minimal';
  llm?: 'on' | 'off';
  // Add more flags as needed in later phases
}

export function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    projectRoot: process.cwd(),
    deterministic: false,
    maxWorkers: undefined,
    detail: 'spec-ready',
    llm: 'on'
  };

  // Skip 'node' and script name
  const positional: string[] = [];
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      if (arg === '--deterministic') {
        args.deterministic = true;
      } else if (arg === '--max-workers') {
        // FIX CRITICAL: Validate that value exists before parsing
        if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
          throw new Error('--max-workers requires a value');
        }
        const value = argv[++i];
        const parsed = parseInt(value, 10);
        if (isNaN(parsed) || parsed <= 0) {
          throw new Error('--max-workers must be a positive integer');
        }
        args.maxWorkers = parsed;
      }
      // Add more flags here
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 0) {
    args.projectRoot = path.resolve(positional[0]);
  }

  return args;
}

export function validateArgs(args: CliArgs): void {
  if (!fs.existsSync(args.projectRoot)) {
    throw new Error(`Project root does not exist: ${args.projectRoot}`);
  }
  if (!fs.statSync(args.projectRoot).isDirectory()) {
    throw new Error(`Project root is not a directory: ${args.projectRoot}`);
  }
}
```

#### 2.3 Add Main Entry Point (Stub)
`src/orchestrator/index.ts`:
```typescript
import { parseArgs, validateArgs } from './cli';

export async function run(argv: string[]): Promise<number> {
  try {
    const args = parseArgs(argv);
    validateArgs(args);

    console.log('ceps v0.1.0');
    console.log(`Project root: ${args.projectRoot}`);
    console.log('Phase 1: KB schema and API contract only');

    // TODO Phase 2: Scanner → Parser → KB → Generator pipeline

    return 0; // success
  } catch (error) {
    console.error('Error:', (error as Error).message);
    return 1; // failure
  }
}

// CLI entry point
if (require.main === module) {
  run(process.argv).then(code => process.exit(code));
}
```

#### 2.4 Verify Tests Pass
```bash
pnpm test tests/unit/orchestrator/cli.test.ts
```

**Acceptance:**
- ✅ All CLI arg parsing tests pass
- ✅ Coverage for `src/orchestrator/cli.ts` ≥80%
- ✅ `ts-node src/orchestrator/index.ts .` runs without error

---

### Step 3: WS-A — KB Schema & Data Models (TDD, ~1 day)

**Goal:** Define all TypeScript interfaces from CTS-01 §2.1 with validation logic.

**TDD Workflow:**

#### 3.1 Write Failing Tests First
`tests/unit/kb/models.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createEntity, createFactSet, createBehaviorChunk } from '../../../src/kb/models';
import { EntityKind, Confidence } from '../../../src/types';

describe('Entity Model', () => {
  it('should create a valid entity', () => {
    const entity = createEntity({
      id: 'test-id',
      kind: 'function',
      name: 'fetchUser',
      path: 'src/api/users.ts',
      signature: 'fetchUser(id: string): Promise<User>',
      visibility: 'public',
      exported: true
    });
    expect(entity.kind).toBe('function');
    expect(entity.exported).toBe(true);
  });

  it('should validate entity kind', () => {
    expect(() => createEntity({
      id: 'test-id',
      kind: 'invalid-kind' as EntityKind,
      name: 'test',
      path: 'test.ts'
    })).toThrow('Invalid entity kind: invalid-kind');
  });

  it('should normalize path separators to POSIX', () => {
    const entity = createEntity({
      id: 'test-id',
      kind: 'function',
      name: 'test',
      path: 'src\\api\\users.ts' // Windows path
    });
    expect(entity.path).toBe('src/api/users.ts');
  });
});

describe('FactSet Model', () => {
  it('should create a factSet with evidence score', () => {
    const factSet = createFactSet({
      id: 'factset-1',
      facts: [
        { subjectId: 'entity-1', predicate: 'calls', object: 'entity-2' }
      ],
      sources: [{ kind: 'ast', file: 'src/test.ts' }],
      evidenceScore: 75
    });
    expect(factSet.evidenceScore).toBe(75);
  });

  it('should clamp evidence score to [0, 100]', () => {
    expect(() => createFactSet({
      id: 'fs-1',
      facts: [],
      sources: [],
      evidenceScore: 150
    })).toThrow('evidenceScore must be between 0 and 100');
    expect(() => createFactSet({
      id: 'fs-1',
      facts: [],
      sources: [],
      evidenceScore: -10
    })).toThrow('evidenceScore must be between 0 and 100');
  });
});

describe('BehaviorChunk Model', () => {
  it('should require at least one factSetId', () => {
    expect(() => createBehaviorChunk({
      id: 'chunk-1',
      targetEntityId: 'entity-1',
      textDraft: 'This function does something',
      factSetIds: [], // Empty!
      confidence: 'High'
    })).toThrow('BehaviorChunk must reference at least one factSet');
  });

  it('should validate confidence values', () => {
    const validConfidences: Confidence[] = ['High', 'Medium', 'Low'];
    validConfidences.forEach(conf => {
      const chunk = createBehaviorChunk({
        id: 'chunk-1',
        targetEntityId: 'entity-1',
        textDraft: 'Test',
        factSetIds: ['factset-1'],
        confidence: conf
      });
      expect(chunk.confidence).toBe(conf);
    });
  });
});
```

#### 3.2 Implement Models with Validation
`src/types/index.ts`:
```typescript
export type EntityKind =
  | 'module' | 'file' | 'export' | 'class' | 'method' | 'function'
  | 'constant' | 'config' | 'endpoint' | 'event';

export const VALID_ENTITY_KINDS: EntityKind[] = [
  'module', 'file', 'export', 'class', 'method', 'function',
  'constant', 'config', 'endpoint', 'event'
];

export type Confidence = 'High' | 'Medium' | 'Low';

export interface SourceRange {
  start: number; // byte offset
  end: number;   // exclusive
}

export interface Source {
  kind: 'ast' | 'aux' | 'derived';
  file?: string;
  range?: SourceRange;
  reader?: string;
}
```

`src/kb/models.ts`:
```typescript
import { EntityKind, Confidence, Source, VALID_ENTITY_KINDS } from '../types';

export interface Relation {
  subjectId: string;
  predicate:
    | 'imports' | 'exports' | 'calls'
    | 'reads' | 'writes' | 'publishes' | 'subscribes'
    | 'uses-config' | 'uses-env';
  objectId?: string;
  details?: Record<string, unknown>;
  source?: Source;
}

export interface Fact {
  subjectId: string;
  predicate: string;
  object?: unknown;
  qualifiers?: Record<string, unknown>;
  source?: Source;
}

export interface FactSet {
  id: string;
  facts: Fact[];
  sources: Source[];
  evidenceScore: number; // 0..100
  parents?: string[];
}

export interface BehaviorChunk {
  id: string;
  targetEntityId: string;
  textDraft: string;
  factSetIds: string[];
  confidence: Confidence;
  assumptions?: string[];
}

export interface Entity {
  id: string;
  kind: EntityKind;
  name: string;
  path: string; // repo-relative POSIX path
  packageId?: string;
  signature?: string;
  visibility?: 'public' | 'internal';
  exported?: boolean;
  attributes?: {
    sideEffects?: string[];
    errors?: string[];
    configInfluences?: string[];
    concurrencyNotes?: string[];
  };
  anchors?: string[];
  qids?: string[];
}

// Factory functions with validation
export function createEntity(data: Partial<Entity> & { id: string; kind: EntityKind; name: string; path: string }): Entity {
  // FIX: Add runtime validation for entity kind
  if (!VALID_ENTITY_KINDS.includes(data.kind)) {
    throw new Error(`Invalid entity kind: ${data.kind}`);
  }

  return {
    ...data,
    path: data.path.replace(/\\/g, '/') // Normalize to POSIX
  };
}

export function createFactSet(data: Partial<FactSet> & { id: string; facts: Fact[]; sources: Source[]; evidenceScore: number }): FactSet {
  if (data.evidenceScore < 0 || data.evidenceScore > 100) {
    throw new Error('evidenceScore must be between 0 and 100');
  }
  return { ...data };
}

export function createBehaviorChunk(data: BehaviorChunk): BehaviorChunk {
  if (!data.factSetIds || data.factSetIds.length === 0) {
    throw new Error('BehaviorChunk must reference at least one factSet');
  }
  return data;
}
```

#### 3.3 Verify Tests Pass
```bash
pnpm test tests/unit/kb/models.test.ts
```

**Acceptance:**
- ✅ All model validation tests pass
- ✅ Coverage for `src/kb/models.ts` ≥80%

---

### Step 4: WS-A — ID Generation (Anchors & QIDs) (TDD, ~1 day)

**Goal:** Implement CTS-01 §2.3 (SHA-256, base62, collision handling).

**TDD Workflow:**

#### 4.1 Write Failing Tests First
`tests/unit/kb/id-generation.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { generateAnchor, generateQID, normalizeContent } from '../../../src/kb/id-generation';

describe('Content Normalization', () => {
  it('should normalize Unicode to NFKC', () => {
    const input = 'café'; // 'e' + combining acute accent
    const normalized = normalizeContent(input);
    expect(normalized).toBe('café'); // NFKC form
  });

  it('should lowercase text', () => {
    expect(normalizeContent('FetchUser')).toBe('fetchuser');
  });

  it('should collapse whitespace to single spaces', () => {
    expect(normalizeContent('fetch  \n  user')).toBe('fetch user');
  });

  it('should trim surrounding whitespace', () => {
    expect(normalizeContent('  fetch user  ')).toBe('fetch user');
  });

  it('should strip surrounding punctuation', () => {
    expect(normalizeContent('(fetch-user)')).toBe('fetch-user');
  });

  it('should handle empty string', () => {
    expect(normalizeContent('')).toBe('');
  });
});

describe('Anchor Generation', () => {
  it('should generate 10-character base62 anchor', () => {
    const anchor = generateAnchor('fetchUser', 'This function fetches a user');
    expect(anchor).toHaveLength(10);
    expect(anchor).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('should be deterministic for same input', () => {
    const anchor1 = generateAnchor('fetchUser', 'content');
    const anchor2 = generateAnchor('fetchUser', 'content');
    expect(anchor1).toBe(anchor2);
  });

  it('should produce different anchors for different content', () => {
    const anchor1 = generateAnchor('fetchUser', 'content A');
    const anchor2 = generateAnchor('fetchUser', 'content B');
    expect(anchor1).not.toBe(anchor2);
  });

  it('should handle collision by extending to 16 characters', () => {
    const anchor = generateAnchor('test', 'content');
    const collision = new Set([anchor]); // Force collision
    const anchor2 = generateAnchor('test', 'content', collision);
    expect(anchor2).toHaveLength(16);
  });

  it('should append -2 suffix if 16-char also collides', () => {
    const anchor = generateAnchor('test', 'content');
    const anchor16 = generateAnchor('test', 'content', new Set([anchor]));
    const collision = new Set([anchor, anchor16]);
    const anchor3 = generateAnchor('test', 'content', collision);
    expect(anchor3).toMatch(/-2$/);
  });
});

describe('QID Generation', () => {
  it('should generate QID with "q:" prefix', () => {
    const qid = generateQID('src/api/users.ts', 'fetchUser', 'missing-return-type');
    expect(qid).toMatch(/^q:[a-zA-Z0-9]{10}$/);
  });

  it('should be deterministic for same inputs', () => {
    const qid1 = generateQID('src/test.ts', 'func', 'ambiguity');
    const qid2 = generateQID('src/test.ts', 'func', 'ambiguity');
    expect(qid1).toBe(qid2);
  });

  it('should handle collision by extending to 16 characters', () => {
    const qid = generateQID('src/test.ts', 'func', 'amb');
    const collision = new Set([qid]);
    const qid2 = generateQID('src/test.ts', 'func', 'amb', collision);
    expect(qid2).toMatch(/^q:[a-zA-Z0-9]{16}$/);
  });

  it('should append -2, -3, etc. if still collides after extension', () => {
    const qid10 = generateQID('src/test.ts', 'func', 'amb');
    const qid16 = generateQID('src/test.ts', 'func', 'amb', new Set([qid10]));
    const collision = new Set([qid10, qid16]);
    const qid3 = generateQID('src/test.ts', 'func', 'amb', collision);
    // FIX: Add proper assertion
    expect(qid3).toMatch(/^q:[a-zA-Z0-9]{16}-2$/);
  });
});
```

#### 4.2 Implement ID Generation
`src/kb/id-generation.ts`:
```typescript
import * as crypto from 'crypto';

const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Converts a Buffer to base62 representation with specified length.
 * Algorithm: Convert full hash to base62, then take leftmost N characters.
 * For 10 chars: ~60 bits of entropy (62^10 ≈ 2^59.5)
 * For 16 chars: ~96 bits of entropy (62^16 ≈ 2^95.3)
 * Padding: If hash produces fewer characters, pad with '0' on the left.
 */
function toBase62(buffer: Buffer, length: number): string {
  let num = BigInt('0x' + buffer.toString('hex'));
  let result = '';
  const base = BigInt(62);

  // Convert to base62 (builds string right-to-left)
  while (num > 0 && result.length < length) {
    const remainder = Number(num % base);
    result = BASE62_CHARS[remainder] + result;
    num = num / base;
  }

  // Pad to desired length (left-pad with '0')
  while (result.length < length) {
    result = '0' + result;
  }

  return result.slice(0, length);
}

export function normalizeContent(text: string): string {
  return text
    .normalize('NFKC')           // Unicode normalization
    .toLowerCase()               // Lowercase
    .replace(/\s+/g, ' ')        // Collapse whitespace
    .trim()                      // Trim edges
    .replace(/^[^\w]+|[^\w]+$/g, ''); // Strip surrounding punctuation
}

export function generateAnchor(
  slug: string,
  content: string,
  existingAnchors: Set<string> = new Set()
): string {
  const normalized = normalizeContent(slug + ' ' + content);
  const hash = crypto.createHash('sha256').update(normalized, 'utf8').digest();

  // First try: 60 bits → 10 base62 chars
  let anchor = toBase62(hash, 10);
  if (!existingAnchors.has(anchor)) {
    return anchor;
  }

  // Collision: extend to 96 bits → 16 chars
  anchor = toBase62(hash, 16);
  if (!existingAnchors.has(anchor)) {
    return anchor;
  }

  // Still collides: append -2, -3, etc.
  for (let i = 2; i <= 99; i++) {
    const suffixed = `${anchor}-${i}`;
    if (!existingAnchors.has(suffixed)) {
      return suffixed;
    }
  }

  throw new Error('Anchor collision limit exceeded (99 suffixes)');
}

export function generateQID(
  filePath: string,
  entityKey: string,
  ambiguityKind: string,
  existingQIDs: Set<string> = new Set()
): string {
  // Normalize path to POSIX
  const normalizedPath = filePath.replace(/\\/g, '/');
  const input = normalizeContent(`${normalizedPath}|${entityKey}|${ambiguityKind}`);
  const hash = crypto.createHash('sha256').update(input, 'utf8').digest();

  // First try: 60 bits → 10 base62 chars
  let shortHash = toBase62(hash, 10);
  let qid = `q:${shortHash}`;
  if (!existingQIDs.has(qid)) {
    return qid;
  }

  // Collision: extend to 96 bits → 16 chars
  const longHash = toBase62(hash, 16);
  qid = `q:${longHash}`;
  if (!existingQIDs.has(qid)) {
    return qid;
  }

  // Still collides: append -2, -3, etc.
  for (let i = 2; i <= 99; i++) {
    const suffixed = `q:${longHash}-${i}`;
    if (!existingQIDs.has(suffixed)) {
      return suffixed;
    }
  }

  throw new Error('QID collision limit exceeded (99 suffixes)');
}
```

#### 4.3 Verify Tests Pass
```bash
pnpm test tests/unit/kb/id-generation.test.ts
```

**Acceptance:**
- ✅ All ID generation tests pass
- ✅ Collision handling verified with synthetic collisions
- ✅ Coverage for `src/kb/id-generation.ts` ≥80%

---

### Step 5: WS-A — Knowledge Base API Contract (TDD, ~1.5 days)

**Goal:** Define and test the KB API interface from CTS-01 §4.3, including stubs for Phase 3 APIs.

**TDD Workflow:**

#### 5.1 Write Failing Tests First
`tests/unit/kb/knowledge-base.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeBase } from '../../../src/kb/knowledge-base';
import { Entity, FactSet, BehaviorChunk } from '../../../src/kb/models';

describe('KnowledgeBase', () => {
  let kb: KnowledgeBase;

  beforeEach(() => {
    kb = new KnowledgeBase();
  });

  describe('Entity Operations', () => {
    it('should insert an entity', () => {
      const entity: Entity = {
        id: 'entity-1',
        kind: 'function',
        name: 'fetchUser',
        path: 'src/api/users.ts'
      };
      kb.insertEntity(entity);
      expect(kb.getEntity('entity-1')).toEqual(entity);
    });

    // FIX CRITICAL-3: Test upsert semantics (no duplicate index entries)
    it('should handle re-inserting same entity ID without duplicating indices', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'v1', path: 'test.ts', exported: true });
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'v2', path: 'test.ts', exported: true });

      const entities = kb.findByPath('test.ts');
      expect(entities).toHaveLength(1); // Should not have duplicates
      expect(entities[0].name).toBe('v2'); // Should have updated name
    });

    it('should update an existing entity', () => {
      const entity: Entity = {
        id: 'entity-1',
        kind: 'function',
        name: 'fetchUser',
        path: 'src/api/users.ts'
      };
      kb.insertEntity(entity);
      kb.updateEntity('entity-1', { signature: 'fetchUser(id: string): Promise<User>' });
      expect(kb.getEntity('entity-1')?.signature).toBe('fetchUser(id: string): Promise<User>');
    });

    // FIX CRITICAL-4: Test that indices are updated when entity properties change
    it('should update indices when entity path changes', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'old.ts', exported: false });
      kb.updateEntity('e1', { path: 'new.ts' });

      expect(kb.findByPath('old.ts')).toHaveLength(0);
      expect(kb.findByPath('new.ts')).toHaveLength(1);
      expect(kb.findByPath('new.ts')[0].id).toBe('e1');
    });

    it('should update exported index when entity export status changes', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'test.ts', exported: false });
      kb.updateEntity('e1', { exported: true });

      const exported = kb.listExported();
      expect(exported).toHaveLength(1);
      expect(exported[0].id).toBe('e1');
    });

    it('should replace nested attributes object when updated', () => {
      kb.insertEntity({
        id: 'e1',
        kind: 'function',
        name: 'foo',
        path: 'test.ts',
        attributes: { sideEffects: ['old'] }
      });

      kb.updateEntity('e1', {
        attributes: { sideEffects: ['new'] }
      });

      const entity = kb.getEntity('e1');
      expect(entity?.attributes?.sideEffects).toEqual(['new']);
    });

    it('should throw error when updating nonexistent entity', () => {
      expect(() => kb.updateEntity('nonexistent', { name: 'test' }))
        .toThrow('Entity not found: nonexistent');
    });

    it('should find entities by path', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'src/test.ts' });
      kb.insertEntity({ id: 'e2', kind: 'function', name: 'bar', path: 'src/test.ts' });
      kb.insertEntity({ id: 'e3', kind: 'function', name: 'baz', path: 'src/other.ts' });

      const entities = kb.findByPath('src/test.ts');
      expect(entities).toHaveLength(2);
      expect(entities.map(e => e.id).sort()).toEqual(['e1', 'e2']);
    });

    it('should list exported entities', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'test.ts', exported: true });
      kb.insertEntity({ id: 'e2', kind: 'function', name: 'bar', path: 'test.ts', exported: false });

      const exported = kb.listExported();
      expect(exported).toHaveLength(1);
      expect(exported[0].id).toBe('e1');
    });
  });

  describe('FactSet Operations', () => {
    it('should insert a factSet', () => {
      const factSet: FactSet = {
        id: 'fs-1',
        facts: [{ subjectId: 'e1', predicate: 'calls', object: 'e2' }],
        sources: [{ kind: 'ast', file: 'test.ts' }],
        evidenceScore: 80
      };
      kb.insertFactSet(factSet);
      expect(kb.getFactSet('fs-1')).toEqual(factSet);
    });
  });

  describe('BehaviorChunk Operations', () => {
    it('should link a chunk to factSets', () => {
      const chunk: BehaviorChunk = {
        id: 'chunk-1',
        targetEntityId: 'e1',
        textDraft: 'This function fetches a user',
        factSetIds: ['fs-1', 'fs-2'],
        confidence: 'High'
      };
      kb.insertChunk(chunk);
      expect(kb.getChunk('chunk-1')).toEqual(chunk);
    });
  });

  describe('Batch Operations', () => {
    it('should support batch transactions', () => {
      kb.beginBatch();
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'test.ts' });
      kb.insertEntity({ id: 'e2', kind: 'function', name: 'bar', path: 'test.ts' });
      kb.commit();

      expect(kb.getEntity('e1')).toBeDefined();
      expect(kb.getEntity('e2')).toBeDefined();
    });

    // FIX CRITICAL-1 & 2: Test that rollback actually works (deep clone)
    it('should rollback changes to entities', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'test.ts' });

      kb.beginBatch();
      kb.updateEntity('e1', { name: 'bar' });
      kb.rollback();

      expect(kb.getEntity('e1')?.name).toBe('foo'); // Should be unchanged
    });

    it('should rollback new entities', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'test.ts' });

      kb.beginBatch();
      kb.insertEntity({ id: 'e2', kind: 'function', name: 'bar', path: 'test.ts' });
      kb.rollback();

      expect(kb.getEntity('e1')).toBeDefined(); // Unchanged
      expect(kb.getEntity('e2')).toBeUndefined(); // Rolled back
    });

    it('should rollback index changes', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'old.ts' });

      kb.beginBatch();
      kb.updateEntity('e1', { path: 'new.ts' });
      kb.rollback();

      expect(kb.findByPath('old.ts')).toHaveLength(1);
      expect(kb.findByPath('new.ts')).toHaveLength(0);
    });
  });

  describe('Stub APIs (Phase 3)', () => {
    it('should return Medium confidence for all factSets in Phase 1', () => {
      const score = kb.scoreConfidence(['fs-1']);
      expect(score).toBe('Medium');
    });

    it('should return empty array for neighbors (stubbed)', () => {
      kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'test.ts' });
      const neighbors = kb.neighbors('e1', 'calls');
      expect(neighbors).toEqual([]);
    });

    it('should return empty array for listOpenQuestions (stubbed)', () => {
      const questions = kb.listOpenQuestions();
      expect(questions).toEqual([]);
    });

    it('should allocate QID using generateQID', () => {
      const qid = kb.allocateQID('src/test.ts', 'foo', 'missing-type');
      expect(qid).toMatch(/^q:[a-zA-Z0-9]{10}$/);
    });

    it('should track allocated QIDs (idempotent allocation)', () => {
      const qid1 = kb.allocateQID('src/test.ts', 'foo', 'missing-type');
      expect(kb.validateQIDUniqueness(qid1)).toBe(false); // Already allocated

      // Calling allocateQID again with same inputs returns the same QID (idempotent)
      const qid2 = kb.allocateQID('src/test.ts', 'foo', 'missing-type');
      expect(qid2).toBe(qid1); // Same QID returned

      // Different entity produces different QID
      const qid3 = kb.allocateQID('src/test.ts', 'bar', 'missing-type');
      expect(qid3).not.toBe(qid1);
      expect(kb.validateQIDUniqueness(qid3)).toBe(false); // Also allocated
    });
  });
});
```

#### 5.2 Implement KB API
`src/kb/knowledge-base.ts`:
```typescript
import { Entity, FactSet, BehaviorChunk, Relation } from './models';
import { EntityKind, Confidence } from '../types';
import { generateQID } from './id-generation';

export class KBError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KBError';
  }
}

interface KBState {
  entities: Map<string, Entity>;
  relations: Relation[]; // NOTE: Unused in Phase 1; populated by Parser in Phase 2
  factSets: Map<string, FactSet>;
  chunks: Map<string, BehaviorChunk>;
  byPath: Map<string, Set<string>>; // FIX: Use Set to prevent duplicates
  byKind: Map<EntityKind, Set<string>>;
  exported: Set<string>;
  qids: Set<string>; // Track allocated QIDs
}

export class KnowledgeBase {
  private state: KBState;
  private batch: KBState | null = null;

  constructor() {
    this.state = this.createEmptyState();
  }

  private createEmptyState(): KBState {
    return {
      entities: new Map(),
      relations: [],
      factSets: new Map(),
      chunks: new Map(),
      byPath: new Map(),
      byKind: new Map(),
      exported: new Set(),
      qids: new Set()
    };
  }

  private getActiveState(): KBState {
    return this.batch ?? this.state;
  }

  // FIX CRITICAL-1 & HIGH-2: Deep clone state properly (including nested arrays/objects)
  private deepCloneEntity(entity: Entity): Entity {
    return {
      ...entity,
      // Clone nested arrays
      anchors: entity.anchors ? [...entity.anchors] : undefined,
      qids: entity.qids ? [...entity.qids] : undefined,
      // Clone nested attributes object and its arrays
      attributes: entity.attributes ? {
        sideEffects: entity.attributes.sideEffects ? [...entity.attributes.sideEffects] : undefined,
        errors: entity.attributes.errors ? [...entity.attributes.errors] : undefined,
        configInfluences: entity.attributes.configInfluences ? [...entity.attributes.configInfluences] : undefined,
        concurrencyNotes: entity.attributes.concurrencyNotes ? [...entity.attributes.concurrencyNotes] : undefined,
      } : undefined,
    };
  }

  private deepCloneFactSet(factSet: FactSet): FactSet {
    return {
      ...factSet,
      // Clone nested arrays
      facts: factSet.facts.map(f => ({ ...f })),
      sources: factSet.sources.map(s => ({ ...s })),
      parents: factSet.parents ? [...factSet.parents] : undefined,
    };
  }

  private deepCloneBehaviorChunk(chunk: BehaviorChunk): BehaviorChunk {
    return {
      ...chunk,
      // Clone nested arrays
      factSetIds: [...chunk.factSetIds],
      assumptions: chunk.assumptions ? [...chunk.assumptions] : undefined,
    };
  }

  private deepCloneState(state: KBState): KBState {
    return {
      // Deep clone entities (clone Map, Entity objects, and nested arrays/objects)
      entities: new Map(Array.from(state.entities.entries())
        .map(([k, v]) => [k, this.deepCloneEntity(v)])),
      // Clone relations array
      relations: [...state.relations],
      // Deep clone factSets (clone Map, FactSet objects, and nested arrays)
      factSets: new Map(Array.from(state.factSets.entries())
        .map(([k, v]) => [k, this.deepCloneFactSet(v)])),
      // Deep clone chunks (clone Map, BehaviorChunk objects, and nested arrays)
      chunks: new Map(Array.from(state.chunks.entries())
        .map(([k, v]) => [k, this.deepCloneBehaviorChunk(v)])),
      // Deep clone index Sets
      byPath: new Map(Array.from(state.byPath.entries())
        .map(([k, v]) => [k, new Set(v)])),
      byKind: new Map(Array.from(state.byKind.entries())
        .map(([k, v]) => [k, new Set(v)])),
      // Clone exported Set
      exported: new Set(state.exported),
      // Clone QIDs Set
      qids: new Set(state.qids)
    };
  }

  // -------- Entity Operations --------
  insertEntity(entity: Entity): void {
    const state = this.getActiveState();
    const existingEntity = state.entities.get(entity.id);

    // FIX CRITICAL-3: Remove old index entries if entity already exists (upsert)
    if (existingEntity) {
      this.removeFromIndices(existingEntity, state);
    }

    state.entities.set(entity.id, entity);

    // Update indices with new entity
    if (!state.byPath.has(entity.path)) {
      state.byPath.set(entity.path, new Set());
    }
    state.byPath.get(entity.path)!.add(entity.id);

    if (!state.byKind.has(entity.kind)) {
      state.byKind.set(entity.kind, new Set());
    }
    state.byKind.get(entity.kind)!.add(entity.id);

    if (entity.exported) {
      state.exported.add(entity.id);
    }
  }

  // FIX CRITICAL-4: Update indices when entity properties change
  updateEntity(id: string, updates: Partial<Entity>): void {
    const state = this.getActiveState();
    const entity = state.entities.get(id);
    if (!entity) {
      throw new KBError(`Entity not found: ${id}`);
    }

    // Remove old index entries if indexed properties changed
    const pathChanged = updates.path !== undefined && updates.path !== entity.path;
    const kindChanged = updates.kind !== undefined && updates.kind !== entity.kind;
    const exportedChanged = updates.exported !== undefined && updates.exported !== entity.exported;

    if (pathChanged || kindChanged || exportedChanged) {
      this.removeFromIndices(entity, state);
    }

    // Apply updates
    Object.assign(entity, updates);

    // Re-add to indices with new values
    if (pathChanged || kindChanged || exportedChanged) {
      if (!state.byPath.has(entity.path)) {
        state.byPath.set(entity.path, new Set());
      }
      state.byPath.get(entity.path)!.add(entity.id);

      if (!state.byKind.has(entity.kind)) {
        state.byKind.set(entity.kind, new Set());
      }
      state.byKind.get(entity.kind)!.add(entity.id);

      if (entity.exported) {
        state.exported.add(entity.id);
      } else {
        state.exported.delete(entity.id);
      }
    }
  }

  private removeFromIndices(entity: Entity, state: KBState): void {
    // Remove from byPath
    const pathSet = state.byPath.get(entity.path);
    if (pathSet) {
      pathSet.delete(entity.id);
      if (pathSet.size === 0) {
        state.byPath.delete(entity.path);
      }
    }

    // Remove from byKind
    const kindSet = state.byKind.get(entity.kind);
    if (kindSet) {
      kindSet.delete(entity.id);
      if (kindSet.size === 0) {
        state.byKind.delete(entity.kind);
      }
    }

    // Remove from exported
    if (entity.exported) {
      state.exported.delete(entity.id);
    }
  }

  getEntity(id: string): Entity | undefined {
    return this.getActiveState().entities.get(id);
  }

  findByPath(path: string): Entity[] {
    const state = this.getActiveState();
    const ids = state.byPath.get(path);
    if (!ids) return [];
    return Array.from(ids).map(id => state.entities.get(id)!).filter(Boolean);
  }

  listExported(): Entity[] {
    const state = this.getActiveState();
    return Array.from(state.exported).map(id => state.entities.get(id)!).filter(Boolean);
  }

  // -------- FactSet Operations --------
  insertFactSet(factSet: FactSet): void {
    this.getActiveState().factSets.set(factSet.id, factSet);
  }

  getFactSet(id: string): FactSet | undefined {
    return this.getActiveState().factSets.get(id);
  }

  // -------- BehaviorChunk Operations --------
  insertChunk(chunk: BehaviorChunk): void {
    this.getActiveState().chunks.set(chunk.id, chunk);
  }

  getChunk(id: string): BehaviorChunk | undefined {
    return this.getActiveState().chunks.get(id);
  }

  // -------- Stub APIs (Phase 3 Implementation) --------

  /**
   * Stub: Confidence scoring algorithm (Phase 3).
   * Always returns "Medium" in Phase 1.
   */
  scoreConfidence(factSetIds: string[]): Confidence {
    // TODO Phase 3: Implement weighted scoring algorithm (CTS-01 §3)
    return 'Medium';
  }

  /**
   * Stub: Query related entities by relation type (Phase 3).
   * Returns empty array in Phase 1.
   */
  neighbors(entityId: string, relation: string): Entity[] {
    // TODO Phase 3: Implement using callGraph/importGraph/reverseDeps indices
    return [];
  }

  /**
   * Stub: List all open questions (Phase 3).
   * Returns empty array in Phase 1.
   */
  listOpenQuestions(): Array<{ qid: string; entityId: string; text: string }> {
    // TODO Phase 3: Implement by iterating entities with qids[]
    return [];
  }

  /**
   * Allocate a QID for an ambiguity (idempotent).
   * Uses generateQID and tracks allocated QIDs.
   * FIX HIGH-1: Make idempotent (same inputs → same QID)
   */
  allocateQID(filePath: string, entityKey: string, ambiguityKind: string): string {
    const state = this.getActiveState();

    // Generate deterministic QID without collision handling
    const deterministicQID = generateQID(filePath, entityKey, ambiguityKind, new Set());

    // If already allocated, return existing (idempotent behavior)
    if (state.qids.has(deterministicQID)) {
      return deterministicQID;
    }

    // Otherwise, generate with collision handling against all allocated QIDs
    const actualQID = generateQID(filePath, entityKey, ambiguityKind, state.qids);
    state.qids.add(actualQID);
    return actualQID;
  }

  /**
   * Validate that a QID is unique (not already allocated).
   */
  validateQIDUniqueness(qid: string): boolean {
    const state = this.getActiveState();
    return !state.qids.has(qid);
  }

  /**
   * No-op in Phase 1: Anchors are computed inline during entity creation.
   * Phase 3 may add batch anchor computation for existing entities.
   */
  computeAnchors(): void {
    // TODO Phase 3: Batch anchor computation if needed
  }

  // -------- Batch Operations --------
  beginBatch(): void {
    if (this.batch) {
      throw new KBError('Batch already in progress');
    }
    // FIX CRITICAL-1 & 2: Deep clone current state
    this.batch = this.deepCloneState(this.state);
  }

  commit(): void {
    if (!this.batch) {
      throw new KBError('No batch in progress');
    }
    this.state = this.batch;
    this.batch = null;
  }

  rollback(): void {
    if (!this.batch) {
      throw new KBError('No batch in progress');
    }
    this.batch = null;
  }
}
```

#### 5.3 Verify Tests Pass
```bash
pnpm test tests/unit/kb/knowledge-base.test.ts
```

**Acceptance:**
- ✅ All KB API tests pass (including critical bug fixes)
- ✅ Batch operations work correctly (commit/rollback with deep cloning)
- ✅ Index updates work correctly
- ✅ Stub APIs return expected defaults
- ✅ Coverage for `src/kb/knowledge-base.ts` ≥80%

---

### Step 6: API Documentation (Documentation, ~0.5 days)

**Goal:** Document the KB API contract to freeze it for Phase 2.

Create `docs/API.md`:

```markdown
# ceps Knowledge Base API — v1.0 (Phase 1)

**Status:** FROZEN (no signature changes after Phase 1)
**Date:** 2025-11-03

---

## Entity Operations

### `insertEntity(entity: Entity): void`
Inserts or updates an entity in the KB.

**Parameters:**
- `entity`: Entity object (id, kind, name, path, ...)

**Behavior:**
- If entity.id already exists, replaces the entity (upsert semantics)
- Updates byPath, byKind, and exported indices automatically
- No duplicate index entries created

**Errors:**
- None (always succeeds)

**Example:**
```typescript
kb.insertEntity({
  id: 'entity-1',
  kind: 'function',
  name: 'fetchUser',
  path: 'src/api/users.ts',
  exported: true
});
```

### `updateEntity(id: string, updates: Partial<Entity>): void`
Updates an existing entity's properties.

**Parameters:**
- `id`: Entity ID
- `updates`: Partial entity object with fields to update

**Behavior:**
- Modifies entity in place
- Updates indices if path, kind, or exported properties change
- Throws if entity not found

**Errors:**
- `KBError`: Entity not found

**Example:**
```typescript
kb.updateEntity('entity-1', { signature: 'fetchUser(id: string): Promise<User>' });
```

### `getEntity(id: string): Entity | undefined`
Retrieves an entity by ID.

**Returns:** Entity object or undefined if not found.

### `findByPath(path: string): Entity[]`
Finds all entities in a given file path.

**Parameters:**
- `path`: Repo-relative POSIX path

**Returns:** Array of entities (may be empty)

### `listExported(): Entity[]`
Lists all entities marked as exported.

**Returns:** Array of exported entities

---

## FactSet Operations

### `insertFactSet(factSet: FactSet): void`
Inserts a factSet into the KB.

### `getFactSet(id: string): FactSet | undefined`
Retrieves a factSet by ID.

---

## BehaviorChunk Operations

### `insertChunk(chunk: BehaviorChunk): void`
Inserts a behavior chunk into the KB.

### `getChunk(id: string): BehaviorChunk | undefined`
Retrieves a chunk by ID.

---

## ID Allocation

### `allocateQID(filePath: string, entityKey: string, ambiguityKind: string): string`
Allocates a unique QID for an open question (idempotent).

**Parameters:**
- `filePath`: File path where ambiguity occurs
- `entityKey`: Entity identifier
- `ambiguityKind`: Type of ambiguity (e.g., 'missing-return-type')

**Returns:** QID string (e.g., `q:a1b2c3d4e5`)

**Behavior:**
- Idempotent: Calling with same inputs multiple times returns the same QID
- Deterministic: Same inputs always produce the same hash
- Handles collisions automatically (extends hash or appends suffix)
- Tracks allocated QIDs internally
- Safe to call multiple times for the same ambiguity

### `validateQIDUniqueness(qid: string): boolean`
Checks if a QID is unique (not already allocated).

**Returns:** `true` if unique, `false` if collision

---

## Batch Operations

### `beginBatch(): void`
Starts a batch transaction.

**Behavior:**
- Creates a deep clone of current state
- All operations after this call modify the batch state
- Throws if batch already in progress

### `commit(): void`
Commits the batch transaction.

**Behavior:**
- Replaces main state with batch state
- Throws if no batch in progress

### `rollback(): void`
Rolls back the batch transaction.

**Behavior:**
- Discards batch state
- Main state remains unchanged
- Throws if no batch in progress

---

## Stub APIs (Phase 3 Implementation)

The following APIs are present but stubbed in Phase 1:

### `scoreConfidence(factSetIds: string[]): Confidence`
**Phase 1:** Always returns "Medium"
**Phase 3:** Implements weighted scoring algorithm (CTS-01 §3)

### `neighbors(entityId: string, relation: string): Entity[]`
**Phase 1:** Returns empty array
**Phase 3:** Queries callGraph/importGraph/reverseDeps

### `listOpenQuestions(): Array<{ qid: string; entityId: string; text: string }>`
**Phase 1:** Returns empty array
**Phase 3:** Iterates entities with QIDs and returns formatted questions

### `computeAnchors(): void`
**Phase 1:** No-op (anchors computed inline)
**Phase 3:** May add batch anchor computation

---

## Deferred APIs (Not in Phase 1)

The following APIs will be added in later phases:

- `insertRelation(relation: Relation): void` — Phase 2
- `getRelations(entityId: string): Relation[]` — Phase 2
- `buildCallGraph(): void` — Phase 3
- `buildImportGraph(): void` — Phase 3
- `computeReverseDeps(): void` — Phase 3

---

## Error Handling

All errors throw `KBError` with descriptive messages:
- "Entity not found: {id}"
- "Batch already in progress"
- "No batch in progress"

---

## Determinism

When using batch transactions:
- Rollback fully restores state (no side effects)
- Commit atomically replaces state

All operations are synchronous and deterministic.
```

---

### Step 7: Integration Test (End-to-End Smoke Check)

**Goal:** Verify that KB can be instantiated and used by the orchestrator.

`tests/integration/phase1-smoke.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { KnowledgeBase } from '../../src/kb/knowledge-base';
import { generateAnchor, generateQID } from '../../src/kb/id-generation';

describe('Phase 1 Smoke Test', () => {
  it('should create KB, insert entities, and generate IDs', () => {
    const kb = new KnowledgeBase();

    // Insert entity
    const entityId = generateAnchor('fetchUser', 'src/api/users.ts');
    kb.insertEntity({
      id: entityId,
      kind: 'function',
      name: 'fetchUser',
      path: 'src/api/users.ts',
      exported: true
    });

    // Verify retrieval
    const entity = kb.getEntity(entityId);
    expect(entity).toBeDefined();
    expect(entity?.name).toBe('fetchUser');

    // Generate QID
    const qid = generateQID('src/api/users.ts', 'fetchUser', 'missing-return-type');
    expect(qid).toMatch(/^q:[a-zA-Z0-9]{10}$/);

    // Verify exported listing
    const exported = kb.listExported();
    expect(exported).toHaveLength(1);

    // Test batch operations
    kb.beginBatch();
    kb.insertEntity({
      id: 'temp-entity',
      kind: 'function',
      name: 'tempFunc',
      path: 'src/temp.ts'
    });
    kb.rollback();

    expect(kb.getEntity('temp-entity')).toBeUndefined(); // Should be rolled back
  });

  it('should handle multiple entities and path queries', () => {
    const kb = new KnowledgeBase();

    kb.insertEntity({ id: 'e1', kind: 'function', name: 'foo', path: 'src/api/users.ts' });
    kb.insertEntity({ id: 'e2', kind: 'class', name: 'UserService', path: 'src/api/users.ts' });
    kb.insertEntity({ id: 'e3', kind: 'function', name: 'bar', path: 'src/utils/helpers.ts' });

    const usersEntities = kb.findByPath('src/api/users.ts');
    expect(usersEntities).toHaveLength(2);

    const helpersEntities = kb.findByPath('src/utils/helpers.ts');
    expect(helpersEntities).toHaveLength(1);
  });

  it('should allocate and validate QIDs', () => {
    const kb = new KnowledgeBase();

    const qid1 = kb.allocateQID('src/test.ts', 'foo', 'missing-type');
    expect(qid1).toMatch(/^q:[a-zA-Z0-9]{10}$/);
    expect(kb.validateQIDUniqueness(qid1)).toBe(false); // Already allocated

    const qid2 = kb.allocateQID('src/test.ts', 'bar', 'missing-type');
    expect(qid2).not.toBe(qid1); // Different entity → different QID
  });
});
```

Run:
```bash
pnpm test tests/integration/phase1-smoke.test.ts
```

**Acceptance:**
- ✅ Smoke test passes
- ✅ KB can be used end-to-end
- ✅ ID generation integrates correctly
- ✅ Batch operations work correctly

---

## 3) Acceptance Criteria (Phase 1 Checkpoint)

Before marking Phase 1 complete and proceeding to Phase 2, verify:

### 3.1 Test Infrastructure
- ✅ CI pipeline configured (lint, typecheck, test, coverage)
- ✅ Coverage enforcement set to ≥80% branch coverage
- ✅ CI runs on push and blocks merge on failure

### 3.2 WS-H: Minimal Orchestrator
- ✅ CLI argument parsing works (project root, flags)
- ✅ Validation rejects invalid arguments
- ✅ Flag validation handles missing values correctly
- ✅ Entry point can be invoked: `pnpm start .` runs without error
- ✅ Unit tests for CLI ≥80% coverage

### 3.3 WS-A: KB Schema & Models
- ✅ All TypeScript interfaces defined (Entity, Relation, Fact, FactSet, BehaviorChunk, KnowledgeBase)
- ✅ Factory functions with validation (runtime checks for invalid data)
- ✅ Entity kind runtime validation implemented
- ✅ Path normalization to POSIX format
- ✅ Unit tests for all models ≥80% coverage

### 3.4 WS-A: ID Generation
- ✅ Anchor generation (10-char base62, collision → 16-char, suffix fallback)
- ✅ QID generation (`q:` prefix, same collision handling)
- ✅ Content normalization (Unicode NFKC, lowercase, whitespace collapse)
- ✅ Deterministic output (same input → same ID)
- ✅ Collision suffix tests have proper assertions
- ✅ Unit tests for ID generation ≥80% coverage

### 3.5 WS-A: API Contract
- ✅ KB API defined and documented:
  - `insertEntity`, `updateEntity`, `getEntity`, `findByPath`, `listExported`
  - `insertFactSet`, `getFactSet`
  - `insertChunk`, `getChunk`
  - `scoreConfidence` (stubbed as "Medium")
  - `beginBatch`, `commit`, `rollback`
  - `neighbors`, `listOpenQuestions` (stubbed as empty)
  - `allocateQID`, `validateQIDUniqueness`
  - `computeAnchors` (no-op stub)
- ✅ **Critical bugs fixed:**
  - Deep clone in batch transactions (CRITICAL-1 & 2)
  - Upsert semantics prevent duplicate indices (CRITICAL-3)
  - Index updates when entity properties change (CRITICAL-4)
- ✅ Error handling with typed `KBError`
- ✅ Unit tests for all API methods ≥80% coverage
- ✅ **API contract frozen:** No signature changes after this checkpoint

### 3.6 Integration Smoke Test
- ✅ End-to-end smoke test passes
- ✅ KB can be instantiated and used
- ✅ IDs can be generated and entities inserted
- ✅ Batch operations work correctly with rollback

### 3.7 Documentation
- ✅ API contract documented in `docs/API.md` with:
  - Function signatures
  - Parameter semantics
  - Return value meanings
  - Error conditions
  - Example usage
  - Stub vs. implemented API clarification
- ✅ README.md updated with Phase 1 status

---

## 4) KB API Contract Freeze Checkpoint

**Critical:** Once Phase 1 acceptance criteria are met, the KB API is **FROZEN**.

**What "frozen" means:**
- No changes to function signatures (parameters, return types)
- No removal of existing methods (including stubs)
- New methods can be added in later phases (e.g., graph indices in Phase 3)
- Stub implementations can be replaced with real implementations (signature must remain)
- Internal implementation can change as long as contracts remain stable

**Why this matters:**
- Phase 2 agents (Scanner, Parser, Generator) will depend on this API
- Parallel work cannot proceed if the API is unstable
- Any breaking change requires re-coordination across all agents

**Enforcement:**
- All KB API changes in Phase 2+ must be reviewed for contract stability
- Breaking changes require explicit approval and re-testing of dependent components
- Stub APIs must maintain their signatures even when implementations are added

---

## 5) Deferred Work (Phase 2 & 3)

### 5.1 Phase 2 (Parser populates these)
- **Relations:** `insertRelation`, `getRelations` — Parser will extract and insert relations
- The `relations[]` array exists in KBState but is unused in Phase 1

### 5.2 Phase 3 (Intelligence layer)
- **Confidence scoring algorithm** (CTS-01 §3)
  - Weighted rule model with evidence scores
  - Threshold-based confidence bands
  - Multi-factSet aggregation logic
  - Calibration fixtures
- **Graph indices** (CTS-01 §4.2)
  - `callGraph`: caller → callees
  - `importGraph`: module → imports
  - `reverseDeps`: entity → dependents
- **Reasoning integration** (CTS-01 §5)
  - Intent lifting rules
  - Pattern matching (Express, React, etc.)
  - Iterative resolution

**Why deferred:**
- Confidence scoring requires facts from Parser (Phase 2) to test and calibrate
- Graph indices require relations from Parser (Phase 2) to populate
- Reasoning depends on confidence scoring and graph indices

---

## 6) Estimated Timeline

**Total effort:** ~4-6 agent-days for Phase 1 (revised from 3-5 after review feedback)

| Step | Deliverables | Estimated Time |
|------|-------------|----------------|
| 1. Test infrastructure | CI, test framework, coverage | ~0.5 days |
| 2. WS-H: Minimal orchestrator | CLI harness with validation fixes | ~0.5 days |
| 3. WS-A: KB schema & models | TypeScript interfaces, validation | ~1 day |
| 4. WS-A: ID generation | Anchors, QIDs, collision handling | ~1 day |
| 5. WS-A: API contract | KB class, methods, batch ops, stubs, bug fixes | ~1.5 days |
| 6. API documentation | docs/API.md with comprehensive details | ~0.5 days |
| 7. Integration smoke test | End-to-end verification | ~0.5 days |

**Note:** Additional time for bug fixes and comprehensive testing accounts for revised estimate.

---

## 7) Success Criteria

Phase 1 is **complete** when:

1. ✅ **All unit tests pass** with ≥80% branch coverage
2. ✅ **All critical bugs fixed** (batch deep clone, index maintenance, CLI validation, entity kind validation)
3. ✅ **CI pipeline runs successfully** on every commit
4. ✅ **KB API contract is documented and frozen** (docs/API.md complete)
5. ✅ **Stub APIs documented** with clear Phase 3 implementation notes
6. ✅ **Integration smoke test demonstrates KB can be used end-to-end**
7. ✅ **No breaking changes allowed after freeze checkpoint**

**Next step:** Proceed to Phase 2 (Scanner, Parser, Generator, LLM skeleton) with 4 parallel agents.

---

## 8) Tips for Agents Implementing Phase 1

1. **Start with tests, always.** Do not write implementation code until you have a failing test.
2. **Use factories, not constructors.** Factory functions enable runtime validation and normalization.
3. **Keep implementations simple.** Phase 1 is about contracts, not optimization. Stub complex logic (e.g., confidence scoring).
4. **Use Sets for indices.** This prevents duplicate entries automatically (fixes CRITICAL-3).
5. **Deep clone properly.** Clone both containers (Map, Set) and objects inside them (fixes CRITICAL-1 & 2).
6. **Update indices on entity changes.** When path/kind/exported change, update all relevant indices (fixes CRITICAL-4).
7. **Document as you go.** Add JSDoc comments to all public APIs.
8. **Run tests frequently.** After every small change, run `pnpm test` to verify tests still pass.
9. **Commit test + implementation together.** Each commit should include both the test and the code that makes it pass.
10. **Ask for clarification if blocked.** If a requirement is ambiguous, flag it immediately rather than guessing.

---

**End of Phase 1 Plan v1.2**

*This plan follows TDD discipline and is aligned with IMPLEMENTATION_PLAN.md, SADS.md, and CTS-01_KnowledgeBase.md. All critical bugs from both review rounds have been addressed.*
