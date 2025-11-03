# CTS-03 — Specification Generator (Markdown & Linking)

**Version:** 1.0  
**Date:** 2025-11-03  
**Scope:** Root & per-directory generation, anchors/QIDs, cross-linking, style kit, validation.

---

## 1) Purpose & Position
Turn KB behavior chunks into **root `spec.md`** and **per-directory `spec.md`** files **in place** with stable anchors, validated links, consistent tone, and clear Open Question formatting (QIDs).

---

## 2) Inputs & Outputs

- **Inputs:** KB entities, relations, behavior chunks (with factSetId & confidence), anchor/QID maps, package structure.  
- **Outputs:**  
  - Root `spec.md` (overview, architecture map, conventions, index).  
  - Per-directory `spec.md` (overview; per-file sections; exports/elements; Open Questions inline).  
  - Run summary (console): counts, warnings, unresolved QIDs.

---

## 3) Generation Algorithm (Two-Phase Rendering)

### 3.1 Phase 1: Anchor Index Build
- Precompute anchors for **all headings** (files/elements) from KB
- Collect all link targets **before rendering** to handle forward references
- Build global anchor index: `Map<entityId, anchor>`

### 3.2 Phase 2: Render & Validate
1. **Render to memory:** Compose documents using style kit; embed cross-links using prebuilt anchor index
2. **Validate links:** Any unresolved target → downgrade to plain text + warning; Grounding gate failure if systemic
3. **Write to disk:** Root + per-directory `spec.md` (in-place)

### 3.3 Forward Reference Handling
Forward references (Entity B references Entity A before A's anchor exists) are resolved via the prebuilt anchor index. The two-phase approach ensures all anchors are known before any rendering occurs.

---

## 4) Structure & Style

### 4.1 Root `spec.md`
- Title & Purpose  
- System Overview (domain, subsystems, boundaries)  
- Architecture Map (text diagram)  
- Conventions (style, confidence bands, QIDs, link policy)  
- Index: packages and directories (links)

### 4.2 Per-directory `spec.md`
- Directory Overview  
- Per-file sections with:  
  - **File summary**  
  - **Exports/Key Elements** with Spec-Ready content: intent, IO/returns, errors, side effects, dependencies, config influence, concurrency/timing (if any)  
  - **Open Questions** (inline; QIDs)

### 4.3 Formatting
- Present/active voice; short sentences; bullets for multi-step behavior.  
- Minimal code (only when necessary).  
- Conflict notation: **Open Question (Conflict: test vs code)**.  
- Anchors: slug + short hash; link check required.

---

## 5) Monorepo Handling
- Always generate root overview.  
- Group directories by package; include per-package intro and cross-links.  
- Ensure anchors are unique across packages (package prefix in slug if needed).

---

## 6) Anchors, QIDs & Collision Handling

### 6.1 Hash Algorithm
- **Algorithm:** SHA-256, base62-encoded
- **Anchors:** first 60 bits → 10 base62 chars (slugified heading + short content hash)
- **QIDs:** `q:<10-char base62 hash>` over `(filePath + entityKey + ambiguityKind)`

### 6.2 Content Normalization
Before hashing:
- Unicode **NFKC** normalization
- Lowercase
- Collapse whitespace to single spaces
- Trim
- Strip surrounding punctuation
- Path separators normalized to POSIX `/`

### 6.3 Collision Resolution
**QIDs:**
1. Initial: 10-char hash
2. On collision → extend to 96 bits (16 chars)
3. If still collides → append suffix `-n` with sequential integers starting at 2 (cap at `-99`)
4. If still colliding (extremely unlikely) → regenerate with salt (entity id + timestamp) and log warning

**Anchors:**
- Similar strategy; package-prefixed slugs in monorepos to reduce collision risk

### 6.4 Open Questions
- Inline under relevant element; concise and actionable
- QID format: `q:<hash>`
- Finalization deletes resolved QIDs and adds **Finalization Summary** section in changed files

---

## 7) Acceptance

- **Coverage**: all exported/public surfaces appear with Spec-Ready sections or QIDs.  
- **Grounding**: no chunk without factSetId; all links valid or downgraded with warnings.  
- **Consistency**: style kit applied; headings/anchors stable within a run.

---

## 8) Risks & Mitigations
- Anchor/link rot → two-phase render + validator.  
- Overly long files → optional local TOC; keep directory scoping to curb size.  
- Monorepo collisions → package-prefixed slugs and anchor hashes.
