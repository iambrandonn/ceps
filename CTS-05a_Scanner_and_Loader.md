# CTS-05a — Scanner & Loader

**Version:** 1.0  
**Date:** 2025-11-03  
**Scope:** Discovery, file indexing, ignore precedence, monorepo detection, classification, performance.

---

## 1) Purpose & Position
The **Scanner & Loader** discovers all relevant inputs, constructs a deterministic file index grouped by package and directory, and classifies files for downstream components. It does not parse code; it produces a stable inventory for subsequent phases.

---

## 2) Discovery & Index

### 2.1 Index Record
```
FileRecord = {
  path: string,             // repo-relative POSIX path
  packageId: string,        // e.g., '@repo/app' or 'root'
  kind: 'code'|'test'|'config'|'contract'|'other',
  size: number,             // bytes
}
```
The **FileIndex** is an immutable `FileRecord[]` sorted deterministically: by `packageId`, then by `path` (lexicographic).

### 2.2 Classification (kind)
- **code**: `*.js`, `*.ts`, `*.jsx`, `*.tsx` (excluding minified/bundled output)  
- **test**: files in `__tests__/`, `*.test.*`, `*.spec.*`  
- **config**: JSON/YAML in known locations (`config/`, `.env*`, `settings.*`)  
- **contract**: `openapi.*`, `swagger.*`, `*.sql` (migrations/schemas)  
- **other**: everything else (ignored by default)

---

## 3) Ignore Precedence

1) **CLI `--ignore`** (highest priority; glob list).  
2) **Built‑ins**: `node_modules/`, `dist/`, `build/`, `coverage/`, `*.min.js`, generated directories (configurable list).  
3) **VCS ignores** (optional): `.gitignore`, if `--respect-vcs-ignore` is set.  
4) **Per‑package overrides** (`package.json` `"ceps": { "ignore": [...] }`).

Matches are applied on repo-relative POSIX paths; globs follow `minimatch` semantics.

---

## 4) Monorepo Detection & Package IDs

### 4.1 Detection Order
1) `package.json` `"workspaces"` (npm/yarn/pnpm)  
2) `pnpm-workspace.yaml`  
3) `lerna.json`  
4) `nx.json`  
5) Heuristic: presence of `packages/*` and multiple top-level `package.json` files

### 4.2 Package Identification
- **packageId**: npm package name if available; else folder name under `packages/`; else `'root'`.  
- Build a **PackageMap**: `packageId → { rootPath, manifest }` for downstream grouping and root `spec.md` indexing.

---

## 5) Directory Traversal

- BFS over directory tree starting at repo root (to provide stable breadth-first grouping for large trees).  
- Normalize to POSIX separators; resolve symlinks to canonical targets (skip cyclic links).  
- Exclude ignored paths early to reduce I/O.

---

## 6) Outputs & Contracts

- **FileIndex** (immutable array).  
- **PackageMap** for monorepo grouping.  
- Emitted **ScanReport**:
```
ScanReport = {
  files: number,
  packages: number,
  code: number,
  test: number,
  config: number,
  contract: number,
  ignored: number
}
```

---

## 7) Performance & Determinism

- Use `readdir` with `withFileTypes` and streaming where available.  
- Sorting only once at the end; keep per-directory lists in memory to reduce churn.  
- Deterministic ordering by `packageId` then `path` (both lexicographic).

---

## 8) Error Handling

- Unreadable directories → warn and skip; include in summary.  
- Extremely large files (> configurable threshold) → log and include; downstream may skip parsing.  
- Broken symlinks → warn and skip.

---

## 9) Acceptance Criteria

- Index contains all non-ignored inputs with stable ordering and correct classification.  
- Monorepo packages detected per precedence; `packageId`s assigned correctly.  
- Scan completes with summary metrics and without blocking downstream phases.

---

## 10) Risks & Mitigations

- **Misclassification** (e.g., test files in non-standard locations) → allow per-package overrides and CLI `--include-kind` hints.  
- **I/O bottlenecks** → breadth-first traversal and early filtering reduce disk thrash.  
- **Monorepo edge cases** → fall back to heuristic package IDs; still produce a valid root overview.
