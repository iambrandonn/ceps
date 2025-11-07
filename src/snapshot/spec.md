# src/snapshot

**Directory Overview:** This directory contains 9 entities.

## capture.ts

<a id="AgvVRnnlC9"></a>

### captureSnapshot

**Signature:** `({ root, include = ['**/*'], exclude = DEFAULT_EXCLUDE }: CaptureOptions): Promise<SnapshotDocument>`

**Visibility:** Public (exported)

**Behavior:**

- Function captureSnapshot: 
Capture a deterministic snapshot of the workspace rooted at {@link CaptureOptions.root}.
Files are filtered using allowed extensions and ignore rules, normalised per CTS-04,
and hashed to produce a Merkle root recorded in the returned document.

<a id="mYnxVmiIN9"></a>

### writeSnapshot

**Signature:** `(document: SnapshotDocument, outputPath: string): void`

**Visibility:** Public (exported)

**Behavior:**

- Function writeSnapshot: 
Persist a snapshot document to disk using an atomic write (temp file + rename).

**Side effects:**
- filesystem

## hash.ts

<a id="XcwdYVbjL4"></a>

### sha256

**Signature:** `(content: string | Buffer): string`

**Visibility:** Public (exported)

**Behavior:**

- Function sha256: 
Compute a SHA-256 hex digest for the supplied content.


<a id="wDkA2JiXJo"></a>

### computeLeafHash

**Signature:** `(path: string, contentHash: string): string`

**Visibility:** Public (exported)

**Behavior:**

- Function computeLeafHash: 
Compute per-file leaf hash combining path and content hash.
This keeps the Merkle root stable even if two files share identical content.


<a id="Tb5szwgVx0"></a>

### buildMerkleRoot

**Signature:** `(leaves: MerkleLeaf[]): string`

**Visibility:** Public (exported)

**Behavior:**

- Function buildMerkleRoot: 
Build a deterministic Merkle root from sorted leaves.
When the leaf count is odd, the final hash is duplicated (classic Merkle tree behaviour).


<a id="s9qCJJSn56"></a>

### EMPTY_HASH

**Visibility:** Public (exported)

**Behavior:**

- Constant EMPTY_HASH (intent unclear from static analysis)

**Open Questions:**
- q:BIucFbE6np: What is the purpose of constant `EMPTY_HASH` at src/snapshot/hash.ts?

## normalize.ts

<a id="qDvfQtBYzN"></a>

### normalizeContent

**Signature:** `(buffer: Buffer): string`

**Visibility:** Public (exported)

**Behavior:**

- Function normalizeContent: 
Normalize file content according to CTS-04 requirements.


<a id="5UJhZ9u371"></a>

### readAndNormalizeFile

**Signature:** `(path: string): { normalized: string; bytes: number; }`

**Visibility:** Public (exported)

**Behavior:**

- Function readAndNormalizeFile: 
Read a file from disk and return normalized content along with the raw byte size.

**Side effects:**
- filesystem

## verify.ts

<a id="2CpbJfpI2T"></a>

### verifySnapshot

**Signature:** `(root: string, snapshotPath: string, options: VerificationOptions = {}): Promise<import("/src/snapshot/verify").VerificationResult>`

**Visibility:** Public (exported)

**Behavior:**

- Function verifySnapshot: 
Compare the current workspace snapshot with a stored snapshot document.
Returns a structured result detailing added/removed/changed files.


**Side effects:**
- filesystem

**Errors thrown:**
- new Error(`Snapshot not found at ${snapshotPath}`);
- new Error(`Unsupported snapshot version ${snapshot.version}`);

