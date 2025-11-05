# src/validation/lexicon

**Directory Overview:** This directory contains 6 entities.

## lexicon-loader.ts

<a id="f6jp3qTxVv"></a>

### normalizeTerm

**Signature:** `(term: string): string`

**Visibility:** Public (exported)

This function performs an operation.

<a id="Osnn9MBueN"></a>

### LexiconLoader

**Visibility:** Public (exported)

This class represents lexicon loader.

<a id="sLruOu5xvb"></a>

### load

**Signature:** `(path: string): void`

**Visibility:** Public (exported)

This method performs an operation.

**Side effects:**
- filesystem

**Errors thrown:**
- new Error(`Failed to load lexicon from ${path}: ${(error as Error).message}`);

<a id="U3UWZFxatV"></a>

### normalize

**Signature:** `(term: string): string`

**Visibility:** Public (exported)

This method performs an operation.

<a id="IsXQlCpvcC"></a>

### getCanonicals

**Signature:** `(): string[]`

**Visibility:** Public (exported)

This method retrieves data.

<a id="YeuPtdUvWN"></a>

### isLoaded

**Signature:** `(): boolean`

**Visibility:** Public (exported)

This method performs an operation.

