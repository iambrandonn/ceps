# CLI Reference

Command-line interface documentation for **ceps** (Codebase to Specification).

---

## Commands

### `ceps [options] [project-root]`

Initial specification generation. Analyzes the codebase and generates Markdown specifications.

If no `project-root` is specified, the current working directory is used.

### `ceps finalize [options]`

Finalization workflow. Ingests human answers, re-analyzes impacted entities, and patches specifications.

**Required:**
- Must be run from project root (where `.ceps/` directory exists)
- Requires `--answers <path>` flag

**See:** [Finalization Options](#finalization-options) for available flags

---

## Options

### Core Options

#### `--deterministic`
**Type:** Boolean flag
**Default:** `false`

Enables deterministic output mode. When enabled:
- Template outputs are byte-identical across runs
- With `--llm on`, sets `temperature=0` for structural stability
- Recommended for CI/CD environments and golden tests

**Example:**
```bash
ceps --deterministic /path/to/project
```

#### `--max-workers <n>`
**Type:** Positive integer
**Default:** System-dependent

Sets the maximum number of concurrent workers for parallel processing.

**Example:**
```bash
ceps --max-workers 4
```

**Validation:**
- Must be a positive integer
- Throws error if value is missing, zero, negative, or non-integer

---

### LLM Options (Phase 4)

#### `--llm <on|off>`
**Type:** Enum: `'on'` | `'off'`
**Default:** `'on'`

Controls whether LLM-based polishing is used for generated specifications.

- `on`: Use LLM to enhance template output with natural language
- `off`: Pure template mode (byte-identical outputs)

**Example:**
```bash
ceps --llm off              # Template-only mode
ceps --llm on               # LLM-enhanced mode (default)
```

**Validation:**
- Must be exactly `'on'` or `'off'`
- Throws error if value is missing or invalid
- When set to `off`, all other LLM flags are ignored with a warning

---

#### `--llm-provider <provider>`
**Type:** Enum: `'anthropic'` | `'openai'` | `'azure'` | `'local'`
**Default:** System-dependent

Specifies which LLM provider to use for text generation.

**Supported providers:**
- `anthropic` - Anthropic Claude models
- `openai` - OpenAI GPT models
- `azure` - Azure OpenAI Service
- `local` - Local LLM server

**Example:**
```bash
ceps --llm-provider anthropic
ceps --llm-provider openai --llm-model gpt-4
```

**Validation:**
- Must be one of the supported providers
- Throws descriptive error if invalid provider specified
- Ignored with warning if `--llm off`

---

#### `--llm-model <model-name>`
**Type:** String
**Default:** Provider-dependent

Specifies the model name to use with the selected provider.

**Examples:**
```bash
ceps --llm-provider anthropic --llm-model claude-3-opus-20240229
ceps --llm-provider openai --llm-model gpt-4-turbo
```

**Validation:**
- Must be a non-empty string
- Throws error if value is missing
- Ignored with warning if `--llm off`

---

#### `--llm-budget <tokens>`
**Type:** Positive integer
**Default:** Unlimited

Sets a token budget limit for LLM operations. When the budget is exhausted:
- Remaining chunks fall back to template rendering
- Warning is logged with fallback count
- Process continues gracefully (no errors thrown)

**Example:**
```bash
ceps --llm-budget 30000      # Limit to 30k tokens
```

**Validation:**
- Must be a positive integer (> 0)
- Throws error if zero, negative, or non-integer (e.g., `100.5`)
- Ignored with warning if `--llm off`

**Cost gate thresholds (per fixture type):**
- Express API: ≤ 30,000 tokens
- React App: ≤ 40,000 tokens
- Monorepo: ≤ 100,000 tokens

---

#### `--no-llm-cache`
**Type:** Boolean flag
**Default:** `false`

Disables LLM response caching. By default, LLM responses may be cached to improve performance and reduce costs. Use this flag to force fresh completions on every run.

**Example:**
```bash
ceps --no-llm-cache
```

**Validation:**
- No value required (boolean flag)
- Warns if used with `--llm off` (has no effect)
- Ignored with warning if `--llm off`

---

### Finalization Options (Phase 5)

#### `--answers <path>`
**Type:** String (file path)
**Required:** Yes (for `finalize` command)

Path to the answers.md file containing human responses to Open Questions.

**Format:** Markdown file with QID-based Q&A pairs:
```markdown
### q:abc123def456

**Question:** What is the behavior of function `render`?

**Answer:**
Renders the component with title and description.
Accepts `title` and `description` props.
```

**Example:**
```bash
ceps finalize --answers ./answers.md
```

**Validation:**
- File must exist and be readable
- File must contain valid QID markers (format: `q:[A-Za-z0-9]{12}`)
- Throws error if file not found or unreadable

---

#### `--dry-run`
**Type:** Boolean flag
**Default:** `false`

Preview finalization impacts without modifying any files.

When enabled:
- Parses answers and validates QIDs
- Verifies snapshot integrity
- Computes impact scope
- Reports what WOULD be changed
- Does NOT write to disk

**Example:**
```bash
ceps finalize --answers ./answers.md --dry-run
```

**Output:**
```
Dry-run mode: No files will be modified
✓ Snapshot verified
✓ Parsed 3 answers (2 known, 1 unknown)
✓ Impact scope: 5 entities
→ Would patch 3 spec files
→ Would resolve 2 QIDs
```

**Use case:** Review impacts before committing to finalization

---

#### `--reconcile`
**Type:** Boolean flag
**Default:** `false`

Allow finalization to proceed even if files in `.ceps/` have changed since initial run.

By default, finalization verifies that no files have been modified using a Merkle tree snapshot. This flag bypasses that check.

**Example:**
```bash
ceps finalize --answers ./answers.md --reconcile
```

**Warning:** Using `--reconcile` means re-analysis may be based on modified inputs. Use with caution.

**When to use:**
- Intentional edits to source files after initial run
- Manual corrections to KB state
- Development/testing scenarios

**Exit codes:**
- Without `--reconcile`: Exit 3 if snapshot mismatch
- With `--reconcile`: Proceeds regardless of changes

---

### Output Options

#### `--detail <level>`
**Type:** Enum: `'spec-ready'` | `'exhaustive'` | `'minimal'`
**Default:** `'spec-ready'`

Controls the level of detail in generated specifications.

- `spec-ready`: Balanced detail suitable for production specs
- `exhaustive`: Maximum detail, all facts included
- `minimal`: Concise summaries only

**Example:**
```bash
ceps --detail exhaustive
```

---

### Utility Options

#### `--version`
**Type:** Boolean flag

Displays the version number and exits.

**Example:**
```bash
ceps --version
# Output: ceps v0.2.0
```

---

## Flag Interaction Rules

### `--llm off` Interaction

When `--llm off` is specified, all other LLM-related flags are automatically ignored:

```bash
ceps --llm off --llm-provider openai --llm-budget 30000
# Warning: --llm is off; ignoring --llm-provider, --llm-budget
```

**Ignored flags when `--llm off`:**
- `--llm-provider`
- `--llm-model`
- `--llm-budget`
- `--no-llm-cache`

The CLI will:
1. Emit a warning listing all ignored flags
2. Clear the values of ignored flags
3. Continue execution in template-only mode

---

## Examples

### Basic Usage

```bash
# Generate specs for current directory with defaults
ceps

# Generate specs for specific project
ceps /path/to/my-project

# Template-only mode (no LLM)
ceps --llm off --deterministic
```

### LLM Configuration

```bash
# Use Anthropic with specific model
ceps --llm-provider anthropic --llm-model claude-3-opus-20240229

# Use OpenAI with token budget
ceps --llm-provider openai --llm-model gpt-4 --llm-budget 50000

# Disable caching for fresh completions
ceps --no-llm-cache
```

### CI/CD Mode

```bash
# Reproducible builds for testing
ceps --llm off --deterministic --max-workers 2

# Or with LLM but deterministic
ceps --deterministic --llm-provider anthropic
```

### Development Workflow

```bash
# Quick local run with budget control
ceps --llm-budget 10000 --max-workers 4

# Exhaustive documentation generation
ceps --detail exhaustive --llm-provider anthropic
```

### Finalization Workflow (Phase 5)

```bash
# 1. Generate initial specs
ceps /path/to/project --deterministic --llm off

# 2. Review specs and answer Open Questions in answers.md

# 3. Preview finalization impacts
ceps finalize --answers ./answers.md --dry-run

# 4. Run finalization
ceps finalize --answers ./answers.md --deterministic --llm off

# 5. Review patched specs with Finalization Summaries
```

**With source file changes (reconcile mode):**
```bash
# Allow finalization despite file changes
ceps finalize --answers ./answers.md --reconcile
```

**Template-only finalization (no LLM):**
```bash
# Deterministic finalization without LLM polish
ceps finalize --answers ./answers.md --deterministic --llm off
```

---

## Exit Codes

### Initial Generation (`ceps <project-root>`)

- `0`: Success
- `1`: Error (invalid arguments, missing project root, parse failures, etc.)

### Finalization (`ceps finalize`)

- `0`: Success - All answered QIDs resolved and specs patched
- `1`: Error - Invalid arguments, missing KB state, parse failures, file I/O errors
- `3`: Snapshot mismatch - Files changed since initial run (use `--reconcile` to bypass)
- `4`: Unknown QIDs - One or more QIDs in answers.md not found in KB (warning only, partial success)

**Exit code 4 behavior:**
- Known QIDs are still resolved and patched
- Unknown QIDs are logged as warnings
- Finalization completes successfully for valid QIDs
- Exit code 4 signals partial success (review warnings)

---

## Validation Summary

| Flag | Type | Validation Rules |
|------|------|-----------------|
| `--deterministic` | boolean | None |
| `--max-workers` | integer | Must be > 0, must be integer |
| `--detail` | enum | Must be 'spec-ready' \| 'exhaustive' \| 'minimal' |
| `--llm` | enum | Must be 'on' \| 'off' |
| `--llm-provider` | enum | Must be 'anthropic' \| 'openai' \| 'azure' \| 'local' |
| `--llm-model` | string | Must be non-empty |
| `--llm-budget` | integer | Must be > 0, must be integer (no decimals) |
| `--no-llm-cache` | boolean | Warns if `--llm off` |
| `--answers` | string | File must exist and be readable (finalize only) |
| `--dry-run` | boolean | None (finalize only) |
| `--reconcile` | boolean | None (finalize only) |

---

## Notes

- All LLM flags require `--llm on` (default) to be effective
- Budget exhaustion triggers graceful fallback to templates (no errors)
- Deterministic mode ensures structural stability (anchors, factSetIds preserved)
- Template-only mode (`--llm off --deterministic`) guarantees byte-identical outputs

---

**Document version:** 1.1 (Phase 5 Complete)
**Last updated:** 2025-11-06
