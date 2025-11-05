# Lexicon Update Workflow

This document describes the process for maintaining and updating the ceps behavior lexicon (`src/validation/lexicon/ceps.lexicon.json`).

## Purpose

The lexicon normalizes terminology in LLM-generated behavior descriptions to canonical verbs, ensuring consistent vocabulary across specifications. This implements SADS §7.3 lexicon requirements.

## Lexicon Structure

The lexicon is a JSON file mapping canonical verbs to arrays of synonyms:

```json
{
  "validate": ["check", "verify", "confirm", "test"],
  "fetch": ["retrieve", "get", "obtain", "load"],
  "persist": ["save", "write", "record", "store"]
}
```

**Rules:**
- Canonical verbs MUST be alphabetically sorted
- Synonyms MUST NOT appear under multiple canonical verbs (no duplicates)
- Canonical verbs should be clear, technical, and commonly understood

## Adding New Synonyms

When you encounter a new term that should normalize to an existing canonical verb:

### 1. Edit the Lexicon File

Add the synonym to the appropriate canonical verb's array:

```json
{
  "validate": ["check", "verify", "confirm", "test", "ensure"]
}
```

### 2. Run the Lint Command

Ensure the lexicon remains valid:

```bash
pnpm lexicon:lint
```

This checks for:
- ✅ Alphabetical ordering of canonical verbs
- ✅ No duplicate synonyms across canonicals
- ✅ Valid JSON structure

### 3. Run Tests

Verify the change doesn't break anything:

```bash
pnpm test src/validation/__tests__/validator-lexicon.test.ts
```

### 4. Commit

Include the rationale in your commit message:

```bash
git add src/validation/lexicon/ceps.lexicon.json
git commit -m "lexicon: add 'ensure' as synonym for 'validate'

Rationale: LLM frequently uses 'ensure' when describing validation logic."
```

## Adding New Canonical Verbs

When a new concept requires its own canonical verb:

### 1. Identify the Need

New canonicals should be added when:
- The concept is distinct from existing canonicals
- It appears frequently in generated behavior descriptions
- Multiple synonyms naturally group under it

### 2. Add to Lexicon

Insert the new canonical in **alphabetical order**:

```json
{
  "debounce": ["throttle", "rate-limit", "delay"],
  "emit": ["send", "dispatch", "publish", "broadcast"]
}
```

### 3. Document Rationale

Create a tracking issue or update this document with:
- Why this canonical was needed
- Examples of behavior descriptions that use it
- Related canonicals it differs from

### 4. Run Lint & Tests

```bash
pnpm lexicon:lint
pnpm test src/validation/__tests__/validator-lexicon.test.ts
```

## Lint Command

The `lexicon:lint` command performs these checks:

### Alphabetical Order Check

Canonical verbs must be in alphabetical order:

```bash
# ✅ Correct
{ "aggregate": [...], "authorize": [...], "cache": [...] }

# ❌ Incorrect
{ "cache": [...], "aggregate": [...], "authorize": [...] }
```

### Duplicate Synonym Check

Each synonym can only appear under one canonical:

```bash
# ✅ Correct
{
  "fetch": ["retrieve", "get"],
  "persist": ["save", "write"]
}

# ❌ Incorrect (duplicate "get")
{
  "fetch": ["retrieve", "get"],
  "parse": ["decode", "get"]
}
```

### Running the Lint Command

```bash
# Check for issues
pnpm lexicon:lint

# Fix issues automatically (if supported)
pnpm lexicon:lint --fix
```

## Current Canonical Verbs (20)

As of Phase 4 Stage D, the lexicon includes:

1. **aggregate** - Combining multiple items
2. **authorize** - Permission/authentication checks
3. **cache** - Storing for reuse
4. **compute** - Calculations and evaluations
5. **configure** - Setup and initialization
6. **emit** - Sending events/data
7. **fetch** - Retrieving data
8. **filter** - Selecting subsets
9. **guard** - Protection and validation
10. **map** - Transforming data structures
11. **monitor** - Tracking and observation
12. **normalize** - Standardizing formats
13. **parse** - Interpreting structured data
14. **persist** - Saving to storage
15. **publish** - Releasing output
16. **retry** - Re-attempting operations
17. **route** - Directing flow
18. **schedule** - Queuing operations
19. **subscribe** - Listening for events
20. **validate** - Checking correctness

## Integration with Grounding Validator

The lexicon is used during Stage D validation:

1. LLM generates behavior text: *"The service **retrieves** user data from the database."*
2. Lexicon normalizer runs: `"retrieves"` → `"fetch"`
3. Validator checks if normalized terms match KB facts

**Note:** Unknown terms (not in lexicon) are returned as-is and may trigger diagnostics if they don't match KB predicates.

## Maintenance Schedule

- **Quarterly Review:** Check for new patterns in LLM-generated text
- **Post-Generation:** After each large codebase run, review diagnostics for unmapped terms
- **Version Updates:** When updating LLM models, review lexicon coverage

## References

- **SADS §7.3:** Lexicon specification
- **CTS-02 §3.8:** Terminology normalization requirements
- **IMPLEMENTATION_PLAN_PHASE4_WS_F1.md Stage D:** Original implementation plan
