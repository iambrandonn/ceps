# Phase 6 Validation Fix — Phase -1 Investigation Instructions

**Date:** 2025-11-08
**Owner:** Investigation Agent
**Duration:** 3-5 days (can start immediately)
**Context:** Validation failure report shows 0% route detection. Before implementing fixes, we MUST understand what the parser actually emits.

---

## Mission

**Confirm root cause of validation failures by inspecting actual parser output, NOT by guessing or assuming.**

**Critical Question:** Does the parser emit the facts we need for routing patterns, or do we need parser enhancements?

**Success Criteria:** By Day 5, deliver a Phase -1 analysis document that answers:
1. What facts does the parser ACTUALLY emit for router instances and route calls?
2. Are the proposed fixes (§4-7 of validation-fix-plan.md) viable?
3. Which scenario are we in: A (parser limitation), B (cross-entity linking), or C (pattern matcher fix)?

---

## Prerequisites

**Required Reading:**
1. `docs/internal/analysis/VALIDATION_ISSUE_ROUTES_PATTERN_DETECTION.md` — Validation failure report
2. `docs/planning/active/phase6/validation-fix-plan.md` — Fix plan (§2 Phase -1 Investigation Plan, §4-7 hypothetical fixes)
3. `docs/reviews/phase6/plan-validation-fix-review.md` — Code Review feedback (especially Issue #1)

**Tools Needed:**
- `jq` command-line JSON processor (install: `sudo apt install jq` or `brew install jq`)
- Text editor for analysis doc
- Terminal access

**Test File:**
- `output-test/routes.js` — Real Express backend file (2000+ LOC)

---

## Day 1: KB Fact Dump & Initial Analysis

### Step 1.1: Generate KB Debug Dump

**Objective:** Capture what the parser ACTUALLY emits for `output-test/routes.js`.

**Command:**
```bash
cd /media/iambrandonn/Files/ceps

# Run ceps with debug output (this will fail validation but we need the KB state)
npm run ceps output-test -- --llm off --deterministic 2>&1 | tee debug-output.log

# Check if KB dump is available in logs
# If not, we may need to add a debug flag to dump KB to JSON
```

**Expected Output:**
- Logs showing entity creation, fact extraction, pattern matching attempts
- Look for lines like: "Entity created: router (constant)"
- Look for lines like: "Fact emitted: calls-expression = router.post"

**If debug output doesn't include KB state:**

We need to create a debug script. Create `scripts/debug-kb-dump.mjs`:

```javascript
#!/usr/bin/env node

/**
 * Phase 6 Phase -1: KB Debug Dump Script
 *
 * Dumps Knowledge Base state after parsing for investigation.
 * Usage: npx tsx scripts/debug-kb-dump.mjs <project-path>
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Import ceps components
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// NOTE: Adjust imports based on actual ceps architecture
// This is a template - Investigation Agent must adapt to actual exports

async function dumpKB(projectPath) {
  console.log(`\n=== KB DEBUG DUMP FOR: ${projectPath} ===\n`);

  // TODO: Investigation Agent must implement based on actual ceps API
  // Expected workflow:
  // 1. Import Scanner, Parser, KB
  // 2. Scan project
  // 3. Parse files
  // 4. Dump KB entities and facts to JSON

  console.log('ERROR: This script is a template. Investigation Agent must implement.');
  console.log('See: src/orchestrator/orchestrator.ts for actual KB access patterns.');
  console.log('\nAlternative: Add --dump-kb flag to main ceps CLI.');

  process.exit(1);
}

const projectPath = process.argv[2];
if (!projectPath) {
  console.error('Usage: npx tsx scripts/debug-kb-dump.mjs <project-path>');
  process.exit(1);
}

dumpKB(projectPath);
```

**Action for Investigation Agent:**
- Check if ceps already has a KB dump mechanism (search codebase for "dump" or "debug")
- If not, implement the script above by importing actual KB/Parser/Scanner modules
- Alternative: Add a `--dump-kb <output-file>` flag to main CLI (may be cleaner)

### Step 1.2: Extract Entities

**Objective:** Identify what entities were created from `routes.js`.

**Command (if KB dump is JSON):**
```bash
# Assuming KB dump produces kb-dump.json
jq '.entities[] | {id, kind, name, path, exported}' output-test/.ceps/kb-dump.json > entities.json

# Or if entities are in a specific field:
jq '.knowledgeBase.entities[] | {id, kind, name, path}' kb-dump.json

# Count by entity kind
jq '[.entities[] | .kind] | group_by(.) | map({kind: .[0], count: length})' kb-dump.json
```

**Expected Output:**
```json
[
  {"kind": "constant", "count": 15},
  {"kind": "function", "count": 40},
  {"kind": "class", "count": 2}
]
```

**Critical Questions to Answer:**

1. **Is `router` entity present?**
   ```bash
   jq '.entities[] | select(.name == "router")' kb-dump.json
   ```

   **Expected:** `{ "id": "...", "kind": "constant", "name": "router", ... }`

   **If NOT found:** Parser may not detect `const router = express.Router()`

2. **Are route handler functions present?**
   ```bash
   jq '.entities[] | select(.name == "updateDisclosure" or .name == "changeDisclosureActive")' kb-dump.json
   ```

   **Expected:** Multiple function entities with 3 parameters (req, res, next)

   **If NOT found:** Parser may not extract functions defined in same file as routes

### Step 1.3: Extract Facts for Router Entity

**Objective:** Understand what facts are associated with the router constant.

**Command:**
```bash
# Find router entity ID
ROUTER_ID=$(jq -r '.entities[] | select(.name == "router") | .id' kb-dump.json)

# Extract all facts for that entity
jq ".factSets[].facts[] | select(.subjectId == \"$ROUTER_ID\")" kb-dump.json > router-facts.json

# Or if structure is different:
jq --arg id "$ROUTER_ID" '.factSets[] | {id: .id, facts: [.facts[] | select(.subjectId == $id)]}' kb-dump.json
```

**Expected Facts (Ideal Scenario C):**
```json
[
  {"subjectId": "router-1", "predicate": "is-constant", "object": true},
  {"subjectId": "router-1", "predicate": "initializer-call", "object": "Router"},
  {"subjectId": "router-1", "predicate": "calls-expression", "object": "router.post"},
  {"subjectId": "router-1", "predicate": "call-arg-0", "object": "'/disclosure/:id'"},
  {"subjectId": "router-1", "predicate": "call-arg-1", "object": "allowedRoles"},
  {"subjectId": "router-1", "predicate": "call-arg-2", "object": "wrapAsync"},
  {"subjectId": "router-1", "predicate": "call-arg-3", "object": "updateDisclosure"}
]
```

**Reality Check Scenarios:**

**Scenario A (Parser Limitation — WORST CASE):**
```json
[
  {"subjectId": "router-1", "predicate": "is-constant", "object": true},
  {"subjectId": "router-1", "predicate": "initializer-call", "object": "Router"}
  // NO calls-expression facts for router.post/get/put/delete
]
```
**Implication:** Parser doesn't emit route method calls. Escalate to Architecture Review (4-6 weeks for parser enhancement).

**Scenario B (Cross-Entity Issue — MEDIUM COMPLEXITY):**
```json
// Facts for "app" entity (not "router"):
{"subjectId": "app-1", "predicate": "calls-expression", "object": "router.post"}
```
**Implication:** Route calls associated with wrong entity. Need cross-entity linking (1-2 weeks).

**Scenario C (Pattern Matcher Bug — BEST CASE):**
```json
// Facts exist but pattern matcher regex doesn't match:
{"subjectId": "router-1", "predicate": "calls-expression", "object": "router.post"}
// But router pattern looks for "router.get" not "router.post" (regex bug)
```
**Implication:** Simple fix to pattern matcher (3 weeks as planned).

### Step 1.4: Document Day 1 Findings

**Create:** `docs/internal/analysis/phase6-validation-fix-phase-minus-one.md`

**Template:**
```markdown
# Phase 6 Validation Fix — Phase -1 Investigation

**Date:** 2025-11-08
**Owner:** Investigation Agent
**Purpose:** Confirm parser output before implementing fixes
**Status:** 🟡 IN PROGRESS (Day 1 complete)

---

## 1. OSS Project Selection

**Project:** output-test/routes.js (user-provided Express backend)
**Reason:** Real-world validation failure (0% route detection)
**Source:** /media/iambrandonn/Files/ceps/output-test/routes.js
**Size:** 2000+ LOC
**Patterns Expected:** 23 routes, 25+ middleware, 20+ Mongoose queries

---

## 2. KB Fact Dump Analysis

### 2.1 Entity Creation

**Command:**
```bash
jq '[.entities[] | .kind] | group_by(.) | map({kind: .[0], count: length})' kb-dump.json
```

**Results:**
[Paste output here]

**Key Findings:**
- [ ] Router constant entity exists (name: "router")
- [ ] Route handler functions exist (updateDisclosure, changeDisclosureActive, etc.)
- [ ] Entity count matches expected (40 functions from validation report)

### 2.2 Router Entity Facts

**Router Entity ID:** [paste ID]

**Facts Extracted:**
```json
[paste router-facts.json contents]
```

**Critical Analysis:**

| Fact Type | Expected | Found | Status |
|-----------|----------|-------|--------|
| `initializer-call: Router` | ✅ Yes | ✅/❌ | [PASS/FAIL] |
| `calls-expression: router.post` | ✅ Yes | ✅/❌ | [PASS/FAIL] |
| `call-arg-0: '/disclosure/:id'` | ✅ Yes | ✅/❌ | [PASS/FAIL] |
| `call-arg-N` for middleware | ✅ Yes | ✅/❌ | [PASS/FAIL] |

**Preliminary Scenario Assessment:**

**IF no `calls-expression` facts for routes:**
- 🔴 **Scenario A (Parser Limitation)** — Likely
- Implications: Parser doesn't emit route method calls as facts
- Next Steps: Check parser source code, confirm limitation, escalate

**IF `calls-expression` facts exist but under wrong entity:**
- 🟡 **Scenario B (Cross-Entity Linking)** — Likely
- Implications: Need to implement entity association logic
- Next Steps: Investigate parser entity assignment logic

**IF `calls-expression` facts exist under router entity:**
- 🟢 **Scenario C (Pattern Matcher Bug)** — Likely
- Implications: Pattern matcher regex or logic is wrong
- Next Steps: Investigate why pattern matcher rejected these facts

---

## 3. Next Steps (Day 2-4)

- [ ] Day 2: Investigate parser source code (if Scenario A)
- [ ] Day 2: Trace pattern matcher execution (if Scenario C)
- [ ] Day 3: Test alternate fact structures (if ambiguous)
- [ ] Day 4: Confirm scenario and write recommendations
- [ ] Day 5: Present findings to Code Review Agent

---

## 4. Open Questions (Day 1)

1. Does parser emit `calls-expression` facts for `router.get/post/put/delete`?
   - **Answer:** [TBD after fact dump analysis]

2. Are middleware wrapper calls (`allowedRoles`, `wrapAsync`) visible as facts?
   - **Answer:** [TBD]

3. Are route handler functions (`updateDisclosure`, etc.) created as entities?
   - **Answer:** [TBD]

---

**Last Updated:** 2025-11-08 (Day 1 complete)
**Next Update:** 2025-11-09 (Day 2 findings)
```

**Commit this document at end of Day 1** (even if incomplete — shows progress).

---

## Day 2: Parser Source Code Investigation

**Only proceed with this if Day 1 reveals Scenario A (no `calls-expression` facts for routes).**

**If Scenario C confirmed (facts exist, pattern matcher broken), skip to Day 3.**

### Step 2.1: Locate Parser Route Handling

**Objective:** Confirm whether parser SHOULD emit route calls as facts.

**Files to Check:**
```bash
# Find parser files
find src -name "*parser*" -o -name "*extractor*" | grep -E "\.(ts|js)$"

# Likely candidates:
# src/parser/parser.ts
# src/parser/fact-extractor.ts
# src/parser/expression-analyzer.ts
```

**Search for route method handling:**
```bash
# Check if parser knows about route methods
grep -r "\.get\|\.post\|\.put\|\.delete" src/parser/

# Check if method calls are extracted
grep -r "calls-expression" src/parser/
```

### Step 2.2: Test Parser on Simple Router Example

**Create test fixture:**
```javascript
// tests/fixtures/debug/simple-router.js
const express = require('express');
const router = express.Router();

router.get('/users', (req, res) => res.json([]));
router.post('/users', (req, res) => res.json({ id: 1 }));

module.exports = router;
```

**Run parser on this file:**
```bash
# If debug script exists:
npx tsx scripts/debug-kb-dump.mjs tests/fixtures/debug/simple-router.js > simple-router-kb.json

# Check output:
jq '.entities[] | select(.name == "router")' simple-router-kb.json
jq '.factSets[].facts[] | select(.predicate == "calls-expression")' simple-router-kb.json
```

**Expected Outcomes:**

**Outcome A1: No route calls emitted even for simple case**
- **Conclusion:** Parser limitation confirmed (Scenario A)
- **Action:** Document parser enhancement requirements, escalate to Architecture Review
- **Estimated Effort:** 4-6 weeks to enhance parser (affects all frameworks)

**Outcome A2: Simple case works, complex case fails**
- **Conclusion:** Parser works but struggles with router instances vs app instances
- **Action:** May be Scenario B (entity association) or edge case in parser
- **Estimated Effort:** 1-2 weeks to fix parser edge case

**Outcome C: Both work (route calls ARE emitted)**
- **Conclusion:** Pattern matcher is broken, not parser (Scenario C)
- **Action:** Skip to Day 3 (pattern matcher investigation)

### Step 2.3: Document Parser Findings

**Add to Phase -1 doc:**

```markdown
## 5. Parser Source Code Analysis (Day 2)

### 5.1 Parser Architecture

**Key Files:**
- `src/parser/parser.ts` — Main parsing entry point
- `src/parser/fact-extractor.ts` — AST → Facts conversion
- [List other relevant files]

**Route Method Handling:**
- [ ] Parser has explicit logic for `router.get/post/put/delete`
- [ ] OR parser treats them as generic method calls
- [ ] Route calls are emitted as `calls-expression` facts
- [ ] OR route calls are NOT extracted (limitation)

### 5.2 Simple Router Test Results

**Test Fixture:** `tests/fixtures/debug/simple-router.js`

**Parser Output:**
```json
[Paste relevant facts from simple-router-kb.json]
```

**Findings:**
- ✅/❌ Router constant created
- ✅/❌ Route calls emitted as facts
- ✅/❌ Route paths captured (`call-arg-0`)

**Conclusion:**
- [Scenario A / Scenario B / Scenario C]
- [Rationale based on evidence]

---

## 6. Scenario Confirmation (Day 2 End)

**SCENARIO CONFIRMED:** [A / B / C]

**Evidence:**
1. [List key evidence points]
2. [...]

**Implications:**
- [Timeline impact]
- [Fix approach adjustments needed]
- [Escalation required? Yes/No]
```

---

## Day 3: Pattern Matcher Execution Trace

**Only proceed if Scenario C confirmed (facts exist, pattern matcher is suspected).**

**If Scenario A or B, skip to Day 4 (recommendations).**

### Step 3.1: Add Debug Logging to Pattern Matcher

**File to modify:** `src/reasoning/patterns/express/router.ts`

**Add temporary debug logging:**

```typescript
// Around line 39 (matches method)
matches(kb: KnowledgeBase, entity: Entity): boolean {
  console.log(`\n[DEBUG Router Pattern] Checking entity: ${entity.name} (${entity.kind})`);

  try {
    if (entity.kind !== 'constant') {
      console.log(`  ❌ Rejected: Not a constant (kind: ${entity.kind})`);
      return false;
    }

    const hasRouterInit = hasFact(kb, entity, 'initializer-call', 'Router');
    console.log(`  Router() initializer: ${hasRouterInit ? '✅' : '❌'}`);

    if (!hasRouterInit) {
      return false;
    }

    // Check what facts are available
    const factSets = getFactSets(kb, entity);
    console.log(`  FactSets count: ${factSets.length}`);

    for (const fs of factSets) {
      const facts = fs.facts.filter(f => f.subjectId === entity.id);
      console.log(`  Facts for entity: ${facts.length}`);

      const callExprs = facts.filter(f => f.predicate === 'calls-expression');
      console.log(`  calls-expression facts: ${callExprs.length}`);
      callExprs.forEach(f => console.log(`    - ${f.object}`));
    }

    return hasRouterInit;
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return false;
  }
}
```

**Also add to extractRoutes method (around line 137):**

```typescript
private extractRoutes(kb: KnowledgeBase, entity: Entity): RouteHandler[] {
  console.log(`\n[DEBUG extractRoutes] Entity: ${entity.name}`);

  const routes: RouteHandler[] = [];

  try {
    const factSets = getFactSets(kb, entity);
    console.log(`  FactSets: ${factSets.length}`);

    for (const factSet of factSets) {
      const facts = factSet.facts.filter(f => f.subjectId === entity.id);
      console.log(`  Facts: ${facts.length}`);

      const routePattern = new RegExp(`^(${entity.name}|router)\\.(get|post|put|delete|patch)$`, 'i');
      console.log(`  Route pattern regex: ${routePattern}`);

      for (let i = 0; i < facts.length; i++) {
        const fact = facts[i];

        if (fact.predicate === 'calls-expression') {
          console.log(`  Checking call: "${fact.object}"`);
          const match = String(fact.object).match(routePattern);

          if (match) {
            console.log(`    ✅ MATCHED! Method: ${match[2]}`);
            // ... rest of extraction logic
          } else {
            console.log(`    ❌ No match for pattern`);
          }
        }
      }
    }
  } catch (error) {
    console.log(`  ❌ Error in extractRoutes: ${error.message}`);
  }

  console.log(`  Routes extracted: ${routes.length}`);
  return routes;
}
```

### Step 3.2: Run Pattern Matcher with Debug Logging

**Command:**
```bash
npm run ceps output-test -- --llm off 2>&1 | tee pattern-matcher-trace.log

# Or if using unit test:
npm test -- --run tests/reasoning/express-router-pattern.test.ts 2>&1 | tee router-pattern-test.log
```

**Analyze trace output:**

```bash
# Find router entity checks
grep -A 10 "Checking entity: router" pattern-matcher-trace.log

# Find route extraction attempts
grep -A 20 "extractRoutes" pattern-matcher-trace.log

# Find regex matches/failures
grep "MATCHED\|No match" pattern-matcher-trace.log
```

### Step 3.3: Identify Pattern Matcher Bug

**Common bugs to look for:**

**Bug Type 1: Regex doesn't match fact values**
```
[LOG] Checking call: "router.post"
[LOG] Route pattern regex: /^(router|router)\.(get|post|put|delete|patch)$/i
[LOG] ❌ No match for pattern
```
**Diagnosis:** Regex is correct, but fact value doesn't match (extra whitespace? different format?)

**Bug Type 2: Facts under wrong entity**
```
[LOG] Checking entity: router (constant)
[LOG] Facts for entity: 2
[LOG] calls-expression facts: 0  ← BUG: Route calls not associated with this entity
```
**Diagnosis:** Scenario B (cross-entity linking issue)

**Bug Type 3: Regex pattern wrong**
```
[LOG] Route pattern regex: /^(router|router)\.(get|post|put|delete|patch)$/i
[LOG] Checking call: "router.post('/disclosure/:id', ...)"  ← Full expression
[LOG] ❌ No match
```
**Diagnosis:** Regex expects "router.post" but fact contains full call expression

**Bug Type 4: Pattern never called**
```
[LOG] ❌ Rejected: Not a constant (kind: function)
[No "Checking entity: router" log]
```
**Diagnosis:** Router entity not passed to pattern matcher at all (orchestrator issue)

### Step 3.4: Document Pattern Matcher Findings

**Add to Phase -1 doc:**

```markdown
## 7. Pattern Matcher Execution Trace (Day 3)

### 7.1 Debug Logging Added

**Files Modified (temporary):**
- `src/reasoning/patterns/express/router.ts:matches()` — Entity check logging
- `src/reasoning/patterns/express/router.ts:extractRoutes()` — Route extraction logging

**Commit:** [git commit hash] (will be reverted after investigation)

### 7.2 Trace Analysis

**Test Run:** `npm run ceps output-test -- --llm off`

**Key Log Excerpts:**
```
[Paste relevant sections of pattern-matcher-trace.log]
```

**Findings:**

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| Router entity passed to pattern | Yes | Yes/No | ✅/❌ |
| `initializer-call: Router` fact present | Yes | Yes/No | ✅/❌ |
| `calls-expression` facts present | Yes (23+) | X | ✅/❌ |
| Regex matches fact values | Yes | Yes/No | ✅/❌ |

### 7.3 Root Cause Identified

**BUG TYPE:** [Regex mismatch / Wrong entity / Pattern not called / Other]

**Evidence:**
[Paste specific log lines showing the bug]

**Example Fix:**
```typescript
// BEFORE (wrong regex):
const routePattern = new RegExp(`^(${entity.name}|router)\\.(get|post|put|delete|patch)$`, 'i');

// AFTER (corrected regex to match full call expression):
const routePattern = new RegExp(`^(${entity.name}|router)\\.(get|post|put|delete|patch)\\b`, 'i');
// Removed $ (end-of-line anchor) to allow arguments after method name
```

**Validation:**
- [ ] Apply fix to router.ts
- [ ] Re-run trace, confirm routes extracted
- [ ] Remove debug logging, commit fix

---

## 8. Scenario Final Confirmation (Day 3 End)

**CONFIRMED SCENARIO:** [A / B / C]

**Root Cause:** [Specific bug or limitation]

**Fix Approach:** [Proceed with validation-fix-plan.md §4-7 with modifications]

**Timeline Impact:** [None / +1 week / +4 weeks / Escalate]
```

---

## Day 4: Recommendations & Fix Plan Adjustments

### Step 4.1: Scenario Decision Matrix

**Fill out based on Days 1-3 findings:**

```markdown
## 9. Root Cause Confirmation Matrix

| Issue | Hypothesis | Confirmed? | Evidence | Recommended Fix |
|-------|-----------|------------|----------|-----------------|
| **Router instances not detected** | Pattern only checks `app.*`, not `router.*` | ✅/❌ | [Evidence from Day 1-3] | [Fix approach] |
| **Middleware chain ignored** | No middleware facts OR pattern doesn't parse args | ✅/❌ | [Evidence] | [Fix approach] |
| **Dynamic Mongoose models** | `req.model()` chained calls not matched | ✅/❌ | [Evidence] | [Fix approach] |
| **Non-exported route handlers** | Middleware pattern requires `exported: true` | ✅/❌ | [Evidence] | [Fix approach] |

---

## 10. Parser Limitations Discovered

[List any parser limitations found, even if not blockers]

**Limitation 1:** [Description]
- **Impact:** [Which patterns affected]
- **Workaround:** [If any]
- **Defer to:** [post-M3 / Wave 2 / Agent 6]

---

## 11. Scenario-Specific Recommendations

### IF SCENARIO A (Parser Limitation):

**Findings:**
- Parser does NOT emit `calls-expression` facts for `router.get/post/put/delete`
- Router constants ARE detected, but route method calls are invisible

**Recommended Actions:**

1. **ESCALATE to Architecture Review** (same-day)
   - **Attendees:** Investigation Agent, Code Review Agent, Product representative
   - **Decision:** Enhance parser OR defer Express routing OR accept limitation

2. **Parser Enhancement Requirements:**
   - **Scope:** Add AST traversal for method calls on Router instances
   - **Files to Modify:** `src/parser/fact-extractor.ts`, `src/parser/expression-analyzer.ts`
   - **Effort:** 4-6 weeks (affects all framework patterns)
   - **Risk:** HIGH (parser changes affect entire system)

3. **Timeline Impact:**
   - **Original Plan:** 3 weeks (Fixes 1-4)
   - **With Parser Work:** 7-10 weeks (4-6 weeks parser + 3 weeks fixes)
   - **Wave 1B:** Blocked until parser complete

4. **Alternatives:**
   - **Option A1:** Defer Express to Tier 1 (post-M3), proceed with frontend patterns
   - **Option A2:** Accept limitation, document "Router instances not supported, use app.get() instead"
   - **Option A3:** Implement parser enhancement (delay M3)

**ESCALATION REQUIRED:** ✅ YES

---

### IF SCENARIO B (Cross-Entity Linking):

**Findings:**
- `calls-expression` facts exist but associated with wrong entity (e.g., `app` instead of `router`)
- Route paths and handlers ARE in KB, just not linked correctly

**Recommended Actions:**

1. **Modify Fix 1 (Router Detection)** in validation-fix-plan.md:
   - Add cross-entity fact lookup logic
   - Pattern matcher must search for `router.*` facts across all entities
   - Effort: +1-2 weeks to Fix 1

2. **Implementation Approach:**
   ```typescript
   // In router pattern matches():
   // Check not just entity's own facts, but also facts referencing this entity
   const routerCallFacts = kb.getAllFacts('calls-expression', `${entity.name}.*`);
   ```

3. **Timeline Impact:**
   - **Original:** 3 weeks
   - **Adjusted:** 4 weeks (+1 week for cross-entity logic)
   - **Wave 1B:** Minimal delay (1 week)

**ESCALATION REQUIRED:** ❌ NO (proceed with modified fix plan)

---

### IF SCENARIO C (Pattern Matcher Bug):

**Findings:**
- Parser emits correct facts (`calls-expression: router.post`, etc.)
- Pattern matcher regex/logic fails to match these facts
- Bug identified: [Specific issue from Day 3 trace]

**Recommended Actions:**

1. **Proceed with validation-fix-plan.md §4-7 AS PLANNED**
   - Fixes are viable with minor adjustments
   - No parser enhancement needed
   - Timeline: 3 weeks (optimistic)

2. **Immediate Fix:**
   - [Describe specific code change from Day 3 findings]
   - Apply fix, re-run validation, confirm improvement

3. **Timeline Impact:**
   - **None** (proceed as planned)
   - **Wave 1B:** On track to start Week 4

**ESCALATION REQUIRED:** ❌ NO (proceed with implementation)

---

## 12. Fix Plan Revisions Required

**validation-fix-plan.md sections to update:**

### §2.4 Post-Phase -1 Decision Tree (ADD NEW SECTION)
- [Mark confirmed scenario with ✅]
- [Update decision path based on findings]

### §4-7 Fix Implementations (REVISE)
- [Remove "Investigation Required" placeholders]
- [Add confirmed implementation approaches]
- [Adjust effort estimates based on scenario]

### §10 Timeline (UPDATE)
- [Confirm 3-week / 4-week / 7-week timeline]
- [Update resource allocation if needed]

### §11.4 Risk Assessment (UPDATE)
- [Mark confirmed risks as HIGH/MEDIUM/LOW]
- [Add newly discovered risks]

---

## 13. Deliverables (Day 4)

1. **✅ Phase -1 Analysis Document** (this document)
   - **Status:** Complete
   - **Scenario Confirmed:** [A / B / C]
   - **Evidence:** Days 1-3 findings documented

2. **Ground Truth JSON** (for automated validation)
   - **File:** `output-test/routes.ground-truth.json`
   - **See Appendix A for creation script**

3. **Updated Fix Plan** (validation-fix-plan.md)
   - **Sections Revised:** §2.4, §4-7, §10, §11.4
   - **Status:** Ready for Day 5 review

---

## 14. Next Steps (Day 5 — Decision Meeting)

**Meeting Attendees:**
- Investigation Agent (plan author)
- Code Review Agent
- Product representative (if Scenario A escalation)

**Agenda:**
1. Present Phase -1 findings (20 min)
2. Review scenario confirmation and evidence (10 min)
3. Discuss fix plan revisions (15 min)
4. Make Go/No-Go decision on timeline (10 min)
5. Approve updated fix plan OR escalate (5 min)

**Decision Criteria:**
- ✅ **GO:** Scenario C confirmed, proceed with 3-week fix plan
- ⚠️ **ADJUST:** Scenario B confirmed, proceed with 4-week adjusted plan
- 🔴 **ESCALATE:** Scenario A confirmed, architecture review required

**Post-Meeting Actions:**
- [ ] Update validation-fix-plan.md with final revisions
- [ ] Get Code Review Agent approval on revised plan
- [ ] Assign Implementation Agent (if GO/ADJUST)
- [ ] Schedule Architecture Review (if ESCALATE)
```

---

### Step 4.2: Create Ground Truth JSON

**Objective:** Enable automated validation metrics (replaces manual counting).

**Script:** `scripts/create-ground-truth.mjs`

```javascript
#!/usr/bin/env node

/**
 * Ground Truth Annotation Helper
 *
 * Assists in creating ground-truth.json for validation.
 * Usage: npx tsx scripts/create-ground-truth.mjs <source-file>
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createGroundTruth(sourceFile) {
  console.log(`\n=== Ground Truth Creation for: ${sourceFile} ===\n`);

  console.log('This is a MANUAL annotation process.');
  console.log('Review the source file and fill in the template below.\n');

  const groundTruth = {
    sourceFile,
    annotationDate: new Date().toISOString().split('T')[0],
    annotatedBy: 'Investigation Agent',

    routes: [
      // TEMPLATE:
      // {
      //   method: 'POST',
      //   path: '/disclosure/:id',
      //   handler: 'updateDisclosure',
      //   middleware: ['allowedRoles', 'wrapAsync'],
      //   line: 176
      // }

      // TODO: Investigation Agent must manually add all routes from routes.js
    ],

    middleware: [
      // TEMPLATE:
      // {
      //   name: 'updateDisclosure',
      //   type: 'route-handler',
      //   exported: false,
      //   parameterCount: 3,
      //   line: 328
      // }

      // TODO: Investigation Agent must manually add all middleware functions
    ],

    mongooseQueries: [
      // TEMPLATE:
      // {
      //   model: 'Disclosure',
      //   operation: 'updateMany',
      //   function: 'changeDisclosureActive',
      //   line: 340,
      //   isDynamic: true  // true if req.model() used
      // }

      // TODO: Investigation Agent must manually add all Mongoose operations
    ]
  };

  const outputPath = path.join(path.dirname(sourceFile), 'routes.ground-truth.json');
  fs.writeFileSync(outputPath, JSON.stringify(groundTruth, null, 2));

  console.log(`✅ Ground truth template created: ${outputPath}`);
  console.log('\nNEXT STEPS:');
  console.log('1. Open the source file and generated JSON side-by-side');
  console.log('2. Manually fill in routes[], middleware[], and mongooseQueries[]');
  console.log('3. Aim for 100% coverage (all routes, all middleware, all queries)');
  console.log('4. Double-check line numbers for traceability');
  console.log('5. Save and commit ground-truth.json');
  console.log('\nESTIMATED TIME: 2-4 hours for comprehensive annotation\n');
}

const sourceFile = process.argv[2];
if (!sourceFile) {
  console.error('Usage: npx tsx scripts/create-ground-truth.mjs <source-file>');
  console.error('Example: npx tsx scripts/create-ground-truth.mjs output-test/routes.js');
  process.exit(1);
}

createGroundTruth(sourceFile);
```

**Run script:**
```bash
npx tsx scripts/create-ground-truth.mjs output-test/routes.js

# Opens editor to fill in template
code output-test/routes.ground-truth.json
```

**Manual annotation (2-4 hours):**
- Open `output-test/routes.js` and `routes.ground-truth.json` side-by-side
- For each route definition (line 176, 179, 187, 194, etc.), add to `routes[]`
- For each function with (req, res, next), add to `middleware[]`
- For each Mongoose query (updateMany, find, aggregate), add to `mongooseQueries[]`

**Result:** 100% annotated ground truth for automated validation.

---

## Day 5: Decision Meeting & Plan Finalization

### Step 5.1: Prepare Presentation

**Create:** `docs/internal/analysis/phase6-validation-fix-phase-minus-one-summary.md`

**Template:**
```markdown
# Phase 6 Validation Fix — Phase -1 Investigation Summary

**Date:** 2025-11-08 to 2025-11-12 (Day 1-5)
**Presented By:** Investigation Agent
**Audience:** Code Review Agent, Product (if escalation)

---

## Executive Summary

**Mission:** Confirm root cause of 0% route detection before implementing fixes.

**Scenario Confirmed:** [A / B / C]

**Timeline Impact:** [None / +1 week / +4-6 weeks / Escalate]

**Go/No-Go Recommendation:** [GO / ADJUST / ESCALATE]

---

## Key Findings

### 1. Parser Output Analysis

**Router Entity:**
- ✅/❌ Detected as constant
- ✅/❌ `initializer-call: Router` fact present

**Route Method Calls:**
- ✅/❌ `calls-expression` facts present
- ✅/❌ Route paths (`call-arg-0`) captured
- ✅/❌ Middleware chain arguments present

**Evidence:**
[1-2 sentence summary + link to full Phase -1 doc]

### 2. Root Cause

**Confirmed Issue:** [Specific bug or limitation]

**Why Validation Failed:**
[Explain in non-technical terms for Product stakeholder]

**Why Tests Didn't Catch This:**
[Reference §8.0 of validation-fix-plan.md — synthetic test data]

### 3. Fix Approach

**Recommended Fix:** [Summary of Fix 1-4 from validation-fix-plan.md]

**Effort:** [X weeks]

**Risk:** [LOW / MEDIUM / HIGH]

**Dependencies:** [Parser work / None / Cross-team coordination]

---

## Decision Paths

### Path 1: GO (Scenario C)
**IF:** Pattern matcher bug confirmed, parser output is correct

**ACTIONS:**
1. Proceed with validation-fix-plan.md Fixes 1-4
2. Timeline: 3 weeks (optimistic)
3. Wave 1B: Start Week 4

**APPROVER:** Code Review Agent

---

### Path 2: ADJUST (Scenario B)
**IF:** Cross-entity linking issue, parser output needs association logic

**ACTIONS:**
1. Modify Fix 1 (Router Detection) with cross-entity lookup
2. Timeline: 4 weeks (+1 week)
3. Wave 1B: Start Week 5

**APPROVER:** Code Review Agent

---

### Path 3: ESCALATE (Scenario A)
**IF:** Parser doesn't emit route calls, enhancement required

**ACTIONS:**
1. Convene Architecture Review (Product + Tech Lead)
2. Options:
   - A1: Enhance parser (4-6 weeks, delay M3)
   - A2: Defer Express to post-M3, proceed with frontend
   - A3: Accept limitation, document workaround
3. Timeline: TBD after architecture decision
4. Wave 1B: ON HOLD until decision made

**APPROVER:** Product + Architecture Review

---

## Recommendation

**Investigation Agent Recommends:** [Path 1 / Path 2 / Path 3]

**Rationale:**
[Why this path is recommended based on evidence]

**Confidence Level:** [HIGH / MEDIUM / LOW]

---

## Next Steps (If Approved)

1. Update validation-fix-plan.md with confirmed scenario (§2.4)
2. Revise fix implementations (§4-7) with confirmed approaches
3. Assign Implementation Agent (if GO/ADJUST)
4. Begin Fix 1 implementation (if GO)
5. Schedule Architecture Review (if ESCALATE)

---

## Questions for Decision-Makers

1. [Any open questions that need Product input]
2. [Timeline trade-offs to discuss]
3. [Scope clarifications needed]

---

**END OF PRESENTATION**
```

### Step 5.2: Conduct Decision Meeting

**Meeting Script:**

**Minute 0-5: Context Setting**
- Recap validation failure (0% route detection despite 1155 tests)
- Recap plan review feedback (Issue #1 — premature fix design)
- Phase -1 investigation purpose

**Minute 5-25: Findings Presentation**
- Day 1: KB fact dump analysis
- Day 2: Parser source investigation (if Scenario A)
- Day 3: Pattern matcher trace (if Scenario C)
- Day 4: Scenario confirmation

**Minute 25-35: Decision Paths Discussion**
- Present recommended path
- Discuss alternatives
- Address concerns/questions

**Minute 35-45: Decision & Next Steps**
- Decision-maker announces GO/ADJUST/ESCALATE
- Assign next actions
- Set next checkpoint (Week 2 for GO/ADJUST, TBD for ESCALATE)

### Step 5.3: Document Decision

**Create:** `docs/reviews/phase6/validation-phase-minus-one-decision.md`

```markdown
# Phase 6 Validation Fix — Phase -1 Decision

**Date:** 2025-11-12 (Day 5)
**Decision Maker:** Code Review Agent [+ Product if escalation]
**Investigation Lead:** Investigation Agent

---

## Decision

**SCENARIO CONFIRMED:** [A / B / C]

**DECISION:** [GO / ADJUST / ESCALATE]

**TIMELINE:** [3 weeks / 4 weeks / 7+ weeks / TBD]

---

## Rationale

[Why this decision was made, summarizing evidence from Phase -1 investigation]

---

## Conditions (If GO or ADJUST)

1. [Any conditions or caveats for proceeding]
2. [Checkpoints or review gates]
3. [Limitations to document]

---

## Next Steps

**Immediate (Day 6):**
- [ ] Update validation-fix-plan.md (§2.4, §4-7, §10)
- [ ] Get Code Review Agent approval on revised plan
- [ ] Assign Implementation Agent

**Week 2:**
- [ ] Begin Fix 1 implementation (TDD)
- [ ] Checkpoint: Fix 1 progress review

**Week 3-4:**
- [ ] Complete Fixes 2-4
- [ ] Re-validation on output-test/routes.js
- [ ] Go/No-Go decision for Wave 1B

---

## Escalation Actions (If ESCALATE)

- [ ] Schedule Architecture Review (Date: TBD)
- [ ] Prepare parser enhancement requirements doc
- [ ] Notify Wave 1B agents (React/Redux/GraphQL on hold)
- [ ] Update Phase 6 timeline with Product approval

---

**Attendees:**
- Investigation Agent: [Name]
- Code Review Agent: [Name]
- Product Representative: [Name, if present]

**Approval Signatures:**
- [ ] Investigation Agent (plan author)
- [ ] Code Review Agent (technical approval)
- [ ] Product (if scope/timeline change)
```

---

## Appendix A: Quick Reference Commands

```bash
# Day 1: KB Fact Dump
npm run ceps output-test -- --llm off --deterministic 2>&1 | tee debug-output.log

# Extract entities
jq '.entities[] | {id, kind, name, path}' kb-dump.json

# Find router entity
jq '.entities[] | select(.name == "router")' kb-dump.json

# Extract router facts
ROUTER_ID=$(jq -r '.entities[] | select(.name == "router") | .id' kb-dump.json)
jq --arg id "$ROUTER_ID" '.factSets[].facts[] | select(.subjectId == $id)' kb-dump.json

# Count calls-expression facts
jq '[.factSets[].facts[] | select(.predicate == "calls-expression")] | length' kb-dump.json

# Day 3: Pattern Matcher Trace
npm run ceps output-test -- --llm off 2>&1 | grep -A 5 "extractRoutes"

# Day 4: Ground Truth Creation
npx tsx scripts/create-ground-truth.mjs output-test/routes.js

# Day 5: Validation (after fixes)
npx tsx scripts/run-backend-validation.mjs output-test
```

---

## Appendix B: Troubleshooting

### Issue: No KB dump generated

**Problem:** `npm run ceps` doesn't output KB state to JSON.

**Solution:**
1. Check if `--debug` flag exists in CLI
2. If not, implement `scripts/debug-kb-dump.mjs` (see Day 1 Step 1.1)
3. Alternative: Add `console.log(JSON.stringify(kb.export()))` in orchestrator temporarily

### Issue: Can't find router entity in dump

**Problem:** `jq '.entities[] | select(.name == "router")'` returns nothing.

**Diagnosis:**
- Router constant may have different name (e.g., `disclosuresRouter`)
- OR router not detected by parser

**Solution:**
```bash
# List all constants to find router
jq '.entities[] | select(.kind == "constant") | .name' kb-dump.json

# Check if ANY entity has Router() initializer
jq '.factSets[].facts[] | select(.predicate == "initializer-call" and .object == "Router")' kb-dump.json
```

### Issue: Debug logging doesn't show in output

**Problem:** Added `console.log()` but no output when running tests.

**Solution:**
```bash
# Vitest may suppress console.log by default
npm test -- --run --reporter=verbose tests/reasoning/express-router-pattern.test.ts

# Or use console.error instead (always shows):
console.error('[DEBUG]', ...);
```

### Issue: Day 4 ground truth annotation taking too long

**Problem:** Manually annotating 23 routes + 25 middleware + 20 queries is tedious.

**Solution:**
- Annotate 10 routes, 10 middleware, 10 queries (subset validation)
- Mark remaining as TODO in ground-truth.json
- Use partial ground truth for initial metrics, complete later
- Budget 4 hours total (not all in one sitting)

---

## Appendix C: Phase -1 Deliverables Checklist

- [ ] Phase -1 analysis document complete (`phase6-validation-fix-phase-minus-one.md`)
- [ ] Scenario confirmed (A/B/C) with evidence
- [ ] Root cause identified and documented
- [ ] Fix approach recommendations provided
- [ ] Ground truth JSON created (`output-test/routes.ground-truth.json`)
- [ ] Phase -1 summary presentation prepared
- [ ] Decision meeting conducted (Day 5)
- [ ] Decision documented (`validation-phase-minus-one-decision.md`)
- [ ] validation-fix-plan.md updated with confirmed scenario
- [ ] Code Review Agent approval obtained on revised plan

---

**Investigation Status:** 🟡 READY TO START (Day 1)

**Estimated Completion:** 2025-11-12 (Day 5)

**Next Checkpoint:** Day 3 (preliminary scenario assessment)

---

**End of Investigation Instructions**
