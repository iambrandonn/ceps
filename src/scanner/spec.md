# src/scanner

**Directory Overview:** This directory contains 7 entities.

## ignore-rules.ts

<a id="Vc8OG8NrKu"></a>

### IgnoreRules

**Visibility:** Public (exported)

This class represents ignore rules.

<a id="1eFdY48ZPC"></a>

### shouldIgnore

**Signature:** `(filePath: string): boolean`

**Visibility:** Public (exported)

This method performs an operation.

## monorepo.ts

<a id="2PIFqjoZzf"></a>

### detectMonorepo

**Signature:** `(rootPath: string, packageJson: any = {}, lernaJson?: any, hasNxJson?: boolean): import("/src/scanner/monorepo").MonorepoDetectionResult`

**Visibility:** Public (exported)

This function performs an operation.

**Side effects:**
- filesystem

<a id="LKvEuRF2BD"></a>

### buildPackageMap

**Signature:** `(rootPath: string, workspaceGlobs: string[]): Promise<PackageMap>`

**Visibility:** Public (exported)

This function performs an operation.

**Side effects:**
- filesystem

## scanner.ts

<a id="LfrRKHlK1h"></a>

### Scanner

**Visibility:** Public (exported)

This class represents scanner.

<a id="8N7QDxRXiR"></a>

### scan

**Signature:** `(): Promise<FileIndex>`

**Visibility:** Public (exported)

This method performs an operation.

**Side effects:**
- filesystem

<a id="3X6HIgeLjg"></a>

### classifyFile

**Signature:** `(filePath: string): FileEntry`

**Visibility:** Public (exported)

This method performs an operation.

