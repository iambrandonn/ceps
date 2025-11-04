# Phase 3 Implementation Plan Corrections

**Purpose:** This document provides systematic corrections for IMPLEMENTATION_PLAN_PHASE3_PART1.md and PART2.md to align with actual Phase 2 APIs and data models.

**Date:** 2025-11-03
**Based on:** FEEDBACK2.md critical issues

---

## Critical Issue #1: KB APIs and Data Model Alignment

### Problem
Plan uses non-existent APIs and field names that don't match `src/kb/models.ts` and `src/kb/knowledge-base.ts`.

### Corrections Required

#### KB API Methods
| ❌ Incorrect (in plan) | ✅ Correct (actual API) |
|------------------------|------------------------|
| `kb.addEntity(...)` | `kb.insertEntity(...)` |
| `kb.addRelation(...)` | `kb.insertRelation(...)` |
| `kb.addFactSet(...)` | `kb.insertFactSet(...)` |
| `kb.getCallGraph()` | **NEW METHOD NEEDED** (Step 1) |
| `kb.getImportGraph()` | **NEW METHOD NEEDED** (Step 1) |
| `kb.getReverseDeps(id)` | **NEW METHOD NEEDED** (Step 1) |
| `kb.computeConfidence(factSet)` | Replaces stub `kb.scoreConfidence(factSetIds)` |
| `kb.getConfidenceBand(score)` | **NEW METHOD NEEDED** (Step 2) |

#### Entity Model
```typescript
// ❌ Incorrect (in plan)
const entity = kb.addEntity({
  kind: EntityKind.Function,
  name: 'myFunc',
  filePath: '/src/a.ts',  // WRONG FIELD
  exportInfo: { isExported: true, exportName: 'myFunc' }  // WRONG STRUCTURE
});

// ✅ Correct (actual model from models.ts)
const entity: Entity = {
  id: 'func-myFunc-abc123',  // Must be provided
  kind: 'function',  // lowercase string, not EntityKind enum
  name: 'myFunc',
  path: '/src/a.ts',  // NOT filePath
  exported: true,  // Boolean, NOT exportInfo object
  visibility: 'public',  // 'public' | 'internal'
  signature: '(x: number): number',
  attributes: {
    sideEffects: ['I/O'],
    errors: ['TypeError']
  }
};
kb.insertEntity(entity);
```

#### Relation Model
```typescript
// ❌ Incorrect (in plan)
kb.addRelation({
  kind: 'calls',  // WRONG FIELD
  sourceId: funcA.id,  // WRONG FIELD
  targetId: funcB.id  // WRONG FIELD
});

// ✅ Correct (actual model from models.ts)
kb.insertRelation({
  subjectId: funcA.id,  // NOT sourceId
  predicate: 'calls',  // NOT kind
  objectId: funcB.id,  // NOT targetId
  source: { kind: 'ast', file: '/src/a.ts' }
});
```

#### FactSet Model
```typescript
// ❌ Incorrect (in plan)
const factSet: FactSet = {
  id: 'fs-1',
  entityId: funcA.id,  // WRONG FIELD
  facts: [
    { kind: 'export', value: { isExported: true } },  // WRONG STRUCTURE
    { kind: 'jsDoc', value: { summary: 'Does X' } }
  ],
  provenance: { filePath: '/src/a.ts', lineNumber: 10 }  // WRONG STRUCTURE
};

// ✅ Correct (actual model from models.ts)
const factSet: FactSet = {
  id: 'fs-1',
  // NO entityId field - association is via Fact.subjectId
  facts: [
    { subjectId: funcA.id, predicate: 'is-exported', object: true },  // NOT kind/value
    { subjectId: funcA.id, predicate: 'has-jsdoc', object: 'Does X' }
  ],
  sources: [{ kind: 'ast', file: '/src/a.ts' }],  // NOT provenance
  evidenceScore: 90  // 0-100, NOT confidence
};
kb.insertFactSet(factSet);
```

#### BehaviorChunk Model
```typescript
// ❌ Incorrect (in plan)
const chunk: BehaviorChunk = {
  id: 'chunk-1',
  entityId: funcA.id,  // WRONG FIELD
  text: 'Handles requests',  // WRONG FIELD
  confidence: 85,  // WRONG - should be Confidence type
  factSetId: 'fs-1'  // WRONG - should be array
};

// ✅ Correct (actual model from models.ts)
const chunk: BehaviorChunk = {
  id: 'chunk-1',
  targetEntityId: funcA.id,  // NOT entityId
  textDraft: 'Handles requests',  // NOT text
  confidence: 'High',  // Confidence type: 'High' | 'Medium' | 'Low'
  factSetIds: ['fs-1'],  // Array, NOT single factSetId
  assumptions: ['Assumes valid input']  // Optional
};
kb.insertChunk(chunk);
```

---

## Critical Issue #2: Confidence Scoring Spec Drift

### Problem
Implementation in Step 2 is simplified and doesn't cover all entity kinds and reinforcers/penalties from CTS-01.

### Required Expansion

#### Base Evidence Weights (by EntityKind)
```typescript
function computeBaseEvidence(factSet: FactSet): number {
  const entityKind = this.getEntityKind(factSet);  // Lookup via subjectId
  const hasExport = this.hasExportedFact(factSet);
  const hasJSDoc = this.hasJSDocFact(factSet);

  switch (entityKind) {
    case 'function':
      if (hasExport && hasJSDoc) return 40;
      if (hasExport) return 30;
      if (hasJSDoc) return 30;
      return 20;

    case 'class':
      if (hasExport && hasJSDoc) return 40;
      if (hasExport) return 30;
      return 25;

    case 'method':
      if (hasJSDoc) return 35;
      return 25;

    case 'constant':
    case 'config':
      const hasComment = this.hasCommentFact(factSet);
      if (hasComment) return 35;
      return 25;

    case 'endpoint':
      return 45;  // High base for endpoints

    default:
      return 20;
  }
}
```

#### Complete Reinforcers List
```typescript
private computeReinforcers(factSet: FactSet): number {
  let reinforcers = 0;

  // Type annotations: +15
  if (this.hasTypeAnnotations(factSet)) reinforcers += 15;

  // Caller count (from reverseDeps): +10 for ≥3, +5 for 1-2
  const reverseDeps = this.getReverseDeps(this.getSubjectId(factSet));
  if (reverseDeps.size >= 3) reinforcers += 10;
  else if (reverseDeps.size >= 1) reinforcers += 5;

  // Test coverage: +10
  if (this.hasTestCoverageFact(factSet)) reinforcers += 10;

  // Config/env documented: +5
  if (this.hasConfigDocumentation(factSet)) reinforcers += 5;

  // Error handling present: +5
  if (this.hasErrorHandling(factSet)) reinforcers += 5;

  // JSDoc @param/@returns complete: +5
  if (this.hasCompleteJSDoc(factSet)) reinforcers += 5;

  return reinforcers;
}
```

#### Complete Penalties List
```typescript
private computePenalties(factSet: FactSet): number {
  let penalties = 0;

  // Dynamic pattern detected: -20
  if (this.hasDynamicPatternWarning(factSet)) penalties += 20;

  // No type info available: -10
  if (!this.hasTypeAnnotations(factSet)) penalties += 10;

  // Unused (no reverse deps): -5
  const reverseDeps = this.getReverseDeps(this.getSubjectId(factSet));
  if (reverseDeps.size === 0) penalties += 5;

  // TODO/FIXME comment: -10
  if (this.hasTodoComment(factSet)) penalties += 10;

  // Complex cyclomatic complexity: -5 (if measurable)
  if (this.hasHighComplexity(factSet)) penalties += 5;

  return penalties;
}
```

#### Helper Methods Needed
```typescript
// Extract entity ID from factSet (facts have subjectId, not factSet.entityId)
private getSubjectId(factSet: FactSet): string {
  if (factSet.facts.length === 0) throw new Error('Empty factSet');
  return factSet.facts[0].subjectId;
}

// Lookup entity kind from KB
private getEntityKind(factSet: FactSet): string {
  const subjectId = this.getSubjectId(factSet);
  const entity = this.getEntity(subjectId);
  return entity?.kind || 'unknown';
}

// Check for specific fact predicates
private hasExportedFact(factSet: FactSet): boolean {
  return factSet.facts.some(f => f.predicate === 'is-exported' && f.object === true);
}

private hasJSDocFact(factSet: FactSet): boolean {
  return factSet.facts.some(f => f.predicate === 'has-jsdoc');
}

private hasTypeAnnotations(factSet: FactSet): boolean {
  return factSet.facts.some(f => f.predicate === 'has-signature');
}

private hasDynamicPatternWarning(factSet: FactSet): boolean {
  return factSet.facts.some(f => f.predicate === 'dynamic-pattern-warning');
}

private hasTodoComment(factSet: FactSet): boolean {
  const comments = factSet.facts.filter(f => f.predicate === 'has-comment');
  return comments.some(c => /TODO|FIXME/i.test(String(c.object)));
}
```

---

## Major Issue #3: BehaviorChunk Field Mismatches

### Global Find-Replace Required

Throughout both PART1 and PART2 files:

| ❌ Find | ✅ Replace |
|---------|-----------|
| `chunk.text` | `chunk.textDraft` |
| `chunk.entityId` | `chunk.targetEntityId` |
| `chunk.factSetId` | `chunk.factSetIds[0]` (if accessing single) |
| `factSetId: 'fs-1'` | `factSetIds: ['fs-1']` (in constructors) |
| `confidence: 85` | `confidence: 'High'` (use Confidence type) |
| `confidence: 55` | `confidence: 'Medium'` |
| `confidence: 30` | `confidence: 'Low'` |
| `getConfidenceBand(score)` returns `'high'` | returns `'High'` (capitalized) |

### Confidence Type Corrections
```typescript
// ❌ Incorrect
expect(kb.getConfidenceBand(chunk.confidence)).toBe('low');

// ✅ Correct
expect(chunk.confidence).toBe('Low');  // Or use getConfidenceBand(score) helper

// Note: confidence field is Confidence type ('High' | 'Medium' | 'Low')
// Not a number. Store score separately if needed.
```

---

## Major Issue #4: Orchestrator Pipeline Integration

### Problem
Orchestrator code doesn't match actual Phase 2 APIs.

### Scanner Integration
```typescript
// ❌ Incorrect (in plan)
const scanner = new Scanner(this.kb);
await scanner.scan(projectRoot);

// ✅ Correct (actual API from scanner/scanner.ts)
const scanner = new Scanner(projectRoot);  // rootPath in constructor, no KB
const fileIndex = await scanner.scan();  // Returns FileIndex, doesn't modify KB
```

### Parser Integration
```typescript
// ❌ Incorrect (in plan)
const parser = new Parser(this.kb);
await parser.parse();  // No parameters?

// ✅ Correct (actual API from parser/parser.ts)
const parser = new Parser();  // No KB in constructor
const fileIndex = await scanner.scan();  // From scanner

// Parse each file and store in KB
for (const fileEntry of fileIndex.entries) {
  if (fileEntry.kind === 'code') {
    const source = fs.readFileSync(fileEntry.absolutePath, 'utf-8');
    const result = await parser.parseAndStore(
      fileEntry.path,  // Repo-relative path
      source,
      this.kb  // KB passed to parseAndStore
    );
    // result.errors contains parse errors
  }
}
```

### SpecGenerator Integration
```typescript
// ❌ Incorrect (in plan)
const generator = new SpecGenerator(this.kb);
await generator.generate(behaviorChunks, ambiguityQueue);  // Writes files?

// ✅ Correct (actual API from generator/spec-generator.ts)
const generator = new SpecGenerator(this.kb, fileIndex);  // FileIndex optional

// Generate specs (returns content, doesn't write files)
const rootSpec = generator.generateRootSpec(projectRoot);
const directorySpecs = generator.generateDirectorySpecs(projectRoot);

// Write specs to disk (orchestrator's responsibility)
fs.writeFileSync(path.join(projectRoot, 'spec.md'), rootSpec);
for (const [dirPath, content] of Object.entries(directorySpecs)) {
  const fullPath = path.join(projectRoot, dirPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}
```

### OrchestratorResult Fields
```typescript
// ❌ Incorrect (in plan) - missing fields
export interface OrchestratorResult {
  exitCode: number;
  gates: { /* ... */ };
  unresolvedQIDs: string[];
  summary: { /* ... */ };
}

// ✅ Correct - add missing fields
export interface OrchestratorResult {
  exitCode: number;
  gates: {
    coverage: { passed: boolean; details?: string };
    confidence: { passed: boolean; details?: string };
  };
  unresolvedQIDs: string[];
  behaviorChunks: BehaviorChunk[];  // ADD THIS
  validationReport: ValidationReport;  // ADD THIS
  summary: {
    phaseDurations: Record<string, number>;
    entitiesProcessed: number;
    behaviorChunksGenerated: number;
    unresolvedQIDs: number;
  };
}
```

---

## Major Issue #5: Relation Resolution for Graph Indices

### Problem
Call relations store expression text in `objectId` (e.g., `'app.get(...)'`, `'functionName()'`), not entity IDs. Graph indices cannot be built directly from relations.

### Required Preparatory Step

**Add Step 0.5: Relation Resolution (before Step 1)**

#### Objective
Resolve relation endpoints (expression text → entity IDs) to enable graph index construction.

#### Algorithm
```typescript
/**
 * Resolves call relations by converting expression text to entity IDs.
 *
 * Input: Relations from parser with objectId = expression text
 * Output: Resolved relations with objectId = entity ID (or null if unresolved)
 */
class RelationResolver {
  constructor(private kb: KnowledgeBase) {}

  resolve(relations: Relation[]): Relation[] {
    const resolved: Relation[] = [];
    const entityLookup = this.buildEntityLookup();

    for (const relation of relations) {
      if (relation.predicate === 'calls') {
        // objectId is expression text like 'app.get', 'myFunction', 'obj.method()'
        const entityId = this.resolveCallExpression(relation.objectId, entityLookup);

        resolved.push({
          ...relation,
          objectId: entityId || relation.objectId,  // Keep original if unresolved
          details: {
            ...relation.details,
            originalExpression: relation.objectId,  // Preserve original
            resolved: !!entityId
          }
        });
      } else {
        // imports/exports relations use file paths, keep as-is
        resolved.push(relation);
      }
    }

    return resolved;
  }

  private buildEntityLookup(): Map<string, string> {
    // Map: entity name → entity ID
    const lookup = new Map<string, string>();
    const entities = this.kb.getEntity  // Need getAllEntities() method

    // TODO: Implement lookup by name, qualified name (Class.method), etc.
    return lookup;
  }

  private resolveCallExpression(expr: string, lookup: Map<string, string>): string | null {
    // Simple name: 'functionName'
    if (lookup.has(expr)) {
      return lookup.get(expr)!;
    }

    // Qualified name: 'ClassName.methodName'
    const dotIndex = expr.indexOf('.');
    if (dotIndex > 0) {
      const qualifiedName = expr.substring(0, dotIndex + expr.indexOf('('));
      if (lookup.has(qualifiedName)) {
        return lookup.get(qualifiedName)!;
      }
    }

    // Unresolved (dynamic, external library, etc.)
    return null;
  }
}
```

#### Integration with Step 1

In Step 1 (KB Indices), **before** building graphs:

```typescript
getCallGraph(): Map<string, Set<string>> {
  if (this.callGraphCache) {
    return this.callGraphCache;
  }

  // Resolve relations first (Phase 3 addition)
  const resolver = new RelationResolver(this);
  const resolvedRelations = resolver.resolve(this.state.relations);

  // Build graph from resolved relations
  const graph = new Map<string, Set<string>>();
  for (const relation of resolvedRelations) {
    if (relation.predicate === 'calls' && relation.details?.resolved) {
      if (!graph.has(relation.subjectId)) {
        graph.set(relation.subjectId, new Set());
      }
      graph.get(relation.subjectId)!.add(relation.objectId!);
    }
  }

  this.callGraphCache = graph;
  return graph;
}
```

#### Test Coverage Required

Add tests for:
- Simple function calls (resolved)
- Method calls on objects (resolved if method entity exists)
- External library calls (unresolved, skipped in graph)
- Dynamic calls (unresolved, skipped in graph)

---

## Summary of Changes Required

### PART1.md

1. **Lines 48-72**: Update interface contracts to use correct field names
2. **Lines 227-398**: Step 1 tests - replace all API calls and field names
3. **Lines 400-600**: Step 1 implementation - use insertEntity, insertRelation with correct fields
4. **Lines 705-1111**: Step 2 tests and implementation - expand confidence scoring, use correct fields
5. **Lines 1200-1499**: Step 3-4 tests and implementation - update BehaviorChunk fields
6. **Add Step 0.5**: Relation Resolution preparatory step

### PART2.md

1. **Lines 1-500**: Step 5 pattern tests - update to use correct field names
2. **Lines 500-1000**: Step 6 cross-link validation - update Entity.path (not filePath)
3. **Lines 1490-1779**: Step 7 orchestrator - rewrite to use actual Scanner/Parser/Generator APIs
4. **Lines 1780-2100**: Step 8 integration tests - update all field names and API calls

### Global Replacements (Both Files)

Run these replacements across both files:

```bash
# Entity fields
sed -i 's/filePath:/path:/g'
sed -i 's/exportInfo:/exported:/g'

# Relation fields
sed -i 's/kind: '\''calls'\''/predicate: '\''calls'\''/g'
sed -i 's/sourceId:/subjectId:/g'
sed -i 's/targetId:/objectId:/g'

# BehaviorChunk fields
sed -i 's/chunk\.text/chunk.textDraft/g'
sed -i 's/chunk\.entityId/chunk.targetEntityId/g'
sed -i 's/factSetId: '\''fs-/factSetIds: ['\''fs-/g'

# KB methods
sed -i 's/kb\.addEntity/kb.insertEntity/g'
sed -i 's/kb\.addRelation/kb.insertRelation/g'
sed -i 's/kb\.addFactSet/kb.insertFactSet/g'

# Confidence bands (lowercase to capitalized)
sed -i "s/'high'/'High'/g"
sed -i "s/'medium'/'Medium'/g"
sed -i "s/'low'/'Low'/g"
```

---

## Verification Checklist

After applying corrections, verify:

- ✅ No references to `addEntity`, `addRelation`, `addFactSet`
- ✅ No `filePath` field (should be `path`)
- ✅ No `exportInfo` object (should be `exported` boolean)
- ✅ No `relation.kind` (should be `relation.predicate`)
- ✅ No `relation.sourceId/targetId` (should be `subjectId/objectId`)
- ✅ No `factSet.entityId` (association via `Fact.subjectId`)
- ✅ No `chunk.text` (should be `chunk.textDraft`)
- ✅ No `chunk.entityId` (should be `chunk.targetEntityId`)
- ✅ No `chunk.factSetId` (should be `chunk.factSetIds` array)
- ✅ Confidence type uses capitalized strings: 'High', 'Medium', 'Low'
- ✅ Scanner constructed with `rootPath`, not KB
- ✅ Parser.parseAndStore takes (filePath, source, kb)
- ✅ SpecGenerator returns content, doesn't write files
- ✅ Relation resolution step added before graph construction
- ✅ Confidence scoring covers all entity kinds and reinforcers/penalties

---

**End of Corrections Document**

Apply these corrections systematically to both PART1 and PART2 files before agent execution.
