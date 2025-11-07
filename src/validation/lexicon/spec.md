# src/validation/lexicon

**Directory Overview:** This directory contains 6 entities.

## lexicon-loader.ts

<a id="f6jp3qTxVv"></a>

### normalizeTerm

**Signature:** `(term: string): string`

**Visibility:** Public (exported)

**Behavior:**

- Function normalizeTerm: 
Normalize a term using default lexicon.
Convenience function for one-off normalizations.


<a id="Osnn9MBueN"></a>

### LexiconLoader

**Visibility:** Public (exported)

**Behavior:**

- Class LexiconLoader: 
LexiconLoader manages terminology normalization.
Caches loaded lexicon for performance.

**Open Questions:**
- q:PkcnqpCn0D: What are the responsibilities and contract of class `LexiconLoader` at src/validation/lexicon/lexicon-loader.ts?

<a id="sLruOu5xvb"></a>

### load

**Signature:** `(path: string): void`

**Visibility:** Public (exported)

**Behavior:**

- Method load (intent unclear from static analysis)

**Side effects:**
- filesystem

**Errors thrown:**
- new Error(`Failed to load lexicon from ${path}: ${(error as Error).message}`);

<a id="U3UWZFxatV"></a>

### normalize

**Signature:** `(term: string): string`

**Visibility:** Public (exported)

**Behavior:**

- Method normalize (intent unclear from static analysis)

**Open Questions:**
- q:fIYDjrvdlb: What is the behavior of method `normalize` at src/validation/lexicon/lexicon-loader.ts?

<a id="IsXQlCpvcC"></a>

### getCanonicals

**Signature:** `(): string[]`

**Visibility:** Public (exported)

**Behavior:**

- Method getCanonicals (intent unclear from static analysis)

**Open Questions:**
- q:LMBm2SqbfV: What is the behavior of method `getCanonicals` at src/validation/lexicon/lexicon-loader.ts?

<a id="YeuPtdUvWN"></a>

### isLoaded

**Signature:** `(): boolean`

**Visibility:** Public (exported)

**Behavior:**

- Method isLoaded (intent unclear from static analysis)

**Open Questions:**
- q:GQvJxmF1yB: What is the behavior of method `isLoaded` at src/validation/lexicon/lexicon-loader.ts?

