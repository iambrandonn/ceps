# CTS-04 — Finalization Engine (Answer-Guided Re-Iteration)

**Version:** 1.0  
**Date:** 2025-11-03  
**Scope:** Answers ingestion, snapshot check, impact scoping, selective re-reasoning, patching, summaries.

---

## 1) Purpose & Position
Apply human answers to Open Questions and **selectively** re-analyze affected areas, updating only impacted spec sections while preserving the one-time nature of ceps.

---

## 2) Inputs
- `answers.md`: Markdown lines `QID: answer` (free-form prose; may include short lists)
- `.ceps/snapshot.json`: Merkle tree snapshot of normalized inputs from the original run
- KB with QID→entity map and reverse-dependency index

### 2.1 Snapshot Format (`.ceps/snapshot.json`)
```json
{
  "version": "1.0",
  "algorithm": "sha256",
  "rootHash": "base16:...",
  "generatedAt": "2025-11-03T00:00:00Z",
  "files": [
    {"path":"src/a.ts","hash":"base16:...","bytes":1234},
    {"path":"src/b.ts","hash":"base16:...","bytes":987}
  ]
}
```

### 2.2 Merkle Tree Structure
- Store **root hash** and **leaf list** (`files[]` with per-file hashes)
- Internal nodes recomputed on demand; not persisted
- **File ordering:** deterministic lexicographic order of repo-relative POSIX paths

### 2.3 File Normalization Before Hashing
- Read as **UTF-8**; strip **BOM** if present
- Normalize line endings to **LF**
- Trim **trailing whitespace** on each line
- No other transformations

## 3) Preconditions
- Snapshot must match; otherwise require `--reconcile` (labels output **best-effort**).  
- Answers must resolve existing QIDs; unknown/duplicate QIDs are reported in `--dry-run`.

---

## 4) Impact Scoping (defaults & flags)
- **Reverse dependencies** transitive closure with caps: **max hops=3**, **max nodes=250**.  
- Always include directory overviews and root/package summaries referencing impacted entities.  
- Flags: `--finalize-max-hops`, `--finalize-max-nodes`, `--finalize-scope full` (no caps).

---

## 5) Process
1) Parse `answers.md` → attach answers to KB entities.  
2) Compute impacted set via reverse-deps + required summaries.  
3) Re-reason impacted chunks (templates + LLM) and re-validate grounding.  
4) Regenerate affected sections; remove resolved QIDs; insert **Finalization Summary** at top of changed files (what changed & why).  
5) Write to disk; update run summary (count of resolved QIDs, impacted files).

---

## 6) CLI
```bash
ceps finalize --answers ./answers.md
ceps finalize --dry-run
ceps finalize --reconcile --finalize-max-hops 5 --finalize-max-nodes 1000
```

---

## 7) Acceptance
- All answered QIDs removed; summaries present.  
- No unrelated sections changed (scoped diffs).  
- Grounding/coverage gates still pass.

---

## 8) Risks & Mitigations
- Over-expansion of scope → hop/node caps and dry-run preview.  
- Stale answers after code changes → snapshot lock or explicit `--reconcile`.  
- Conflicting answers → per-QID validation; unresolved remain as Open Questions.
