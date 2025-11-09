# src/scanner

**Directory Overview:** This directory contains 6 entities.

## ignore-rules.ts

<a id="Vc8OG8NrKu"></a>

### IgnoreRules

**Visibility:** Public (exported)

**Behavior:**

- Class IgnoreRules (intent unclear from static analysis)

**Open Questions:**
- q:DqE4cK6VIN: What are the responsibilities and contract of class `IgnoreRules` at src/scanner/ignore-rules.ts?

<a id="1eFdY48ZPC"></a>

### shouldIgnore

**Signature:** `(filePath: string): boolean`

**Visibility:** Public (exported)

**Behavior:**

- Method shouldIgnore (intent unclear from static analysis)

**Open Questions:**
- q:8c75v8Xdpt: What is the behavior of method `shouldIgnore` at src/scanner/ignore-rules.ts?

## monorepo.ts

<a id="2PIFqjoZzf"></a>

### detectMonorepo

**Signature:** `(rootPath: string, packageJson: any = {}, lernaJson?: any, hasNxJson?: boolean): import("/src/scanner/monorepo").MonorepoDetectionResult`

**Visibility:** Public (exported)

**Behavior:**

- Parses JSON response data using `JSON.parse()`.

**Side effects:**
- filesystem

<a id="LKvEuRF2BD"></a>

### buildPackageMap

**Signature:** `(rootPath: string, workspaceGlobs: string[]): Promise<PackageMap>`

**Visibility:** Public (exported)

**Behavior:**

- Parses JSON response data using `JSON.parse()`.

**Side effects:**
- filesystem

## scanner.ts

<a id="LfrRKHlK1h"></a>

### Scanner

**Visibility:** Public (exported)

**Behavior:**

- Class Scanner (intent unclear from static analysis)

**Open Questions:**
- q:GWYnpjkyAc: What are the responsibilities and contract of class `Scanner` at src/scanner/scanner.ts?

<a id="8N7QDxRXiR"></a>

### scan

**Signature:** `(): Promise<FileIndex>`

**Visibility:** Public (exported)

**Behavior:**

- Method scan (intent unclear from static analysis)

**Side effects:**
- filesystem

**Open Questions:**
- q:SI0MsIwcHb: What is the behavior of method `scan` at src/scanner/scanner.ts?

