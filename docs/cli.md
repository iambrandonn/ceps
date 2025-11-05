# CLI Reference

Command-line interface documentation for **ceps** (Codebase to Specification).

---

## Usage

```bash
ceps [options] [project-root]
```

If no `project-root` is specified, the current working directory is used.

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

---

## Exit Codes

- `0`: Success
- `1`: Error (invalid arguments, missing project root, etc.)

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

---

## Notes

- All LLM flags require `--llm on` (default) to be effective
- Budget exhaustion triggers graceful fallback to templates (no errors)
- Deterministic mode ensures structural stability (anchors, factSetIds preserved)
- Template-only mode (`--llm off --deterministic`) guarantees byte-identical outputs

---

**Document version:** 1.0 (Phase 4 WS-F2 Stage C)
**Last updated:** 2025-11-05
