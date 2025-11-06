# src/snapshot

**Directory Overview:** This directory contains 9 entities.

## capture.ts

<a id="AgvVRnnlC9"></a>

### captureSnapshot

**Signature:** `({ root, include = ['**/*'], exclude = DEFAULT_EXCLUDE }: CaptureOptions): Promise<SnapshotDocument>`

**Visibility:** Public (exported)

This function performs an operation.

<a id="mYnxVmiIN9"></a>

### writeSnapshot

**Signature:** `(document: SnapshotDocument, outputPath: string): void`

**Visibility:** Public (exported)

This function performs an operation.

**Side effects:**
- filesystem

## hash.ts

<a id="XcwdYVbjL4"></a>

### sha256

**Signature:** `(content: string | Buffer): string`

**Visibility:** Public (exported)

This function performs an operation.

<a id="wDkA2JiXJo"></a>

### computeLeafHash

**Signature:** `(path: string, contentHash: string): string`

**Visibility:** Public (exported)

This function computes values.

<a id="Tb5szwgVx0"></a>

### buildMerkleRoot

**Signature:** `(leaves: MerkleLeaf[]): string`

**Visibility:** Public (exported)

This function performs an operation.

<a id="s9qCJJSn56"></a>

### EMPTY_HASH

**Visibility:** Public (exported)

This constant defines e m p t y_ h a s h.

## normalize.ts

<a id="qDvfQtBYzN"></a>

### normalizeContent

**Signature:** `(buffer: Buffer): string`

**Visibility:** Public (exported)

This function performs an operation.

<a id="5UJhZ9u371"></a>

### readAndNormalizeFile

**Signature:** `(path: string): { normalized: string; bytes: number; }`

**Visibility:** Public (exported)

This function performs an operation.

**Side effects:**
- filesystem

## verify.ts

<a id="2CpbJfpI2T"></a>

### verifySnapshot

**Signature:** `(root: string, snapshotPath: string, options: VerificationOptions = {}): Promise<import("/src/snapshot/verify").VerificationResult>`

**Visibility:** Public (exported)

This function performs an operation.

**Side effects:**
- filesystem

**Errors thrown:**
- new Error(`Snapshot not found at ${snapshotPath}`);
- new Error(`Unsupported snapshot version ${snapshot.version}`);

