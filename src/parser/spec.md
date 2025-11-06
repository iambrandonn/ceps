# src/parser

**Directory Overview:** This directory contains 7 entities.

## fact-extractor.ts

<a id="e2VE852vzC"></a>

### FactExtractor

**Visibility:** Public (exported)

This class represents fact extractor.

<a id="q2m6RQhiCk"></a>

### extract

**Signature:** `(sourceFile: SourceFile, filePath: string): import("/src/parser/fact-extractor").ExtractionResult`

**Visibility:** Public (exported)

This method performs an operation.

## parser.ts

<a id="K9W7rSAWVn"></a>

### Parser

**Visibility:** Public (exported)

This class represents parser.

<a id="YncxQwOTAS"></a>

### parse

**Signature:** `(filePath: string, source: string): Promise<ParseResult>`

**Visibility:** Public (exported)

This method performs an operation.

<a id="rhGK98lAf1"></a>

### parseAndStore

**Signature:** `(filePath: string, source: string, kb: KnowledgeBase): Promise<ParseResult>`

**Visibility:** Public (exported)

This method performs an operation.

**Errors thrown:**
- error;

## pattern-detector.ts

<a id="Za7aaQRcI2"></a>

### PatternDetector

**Visibility:** Public (exported)

This class represents pattern detector.

<a id="AoGp4Jl2zi"></a>

### detect

**Signature:** `(sourceFile: SourceFile, filePath: string): ParseError[]`

**Visibility:** Public (exported)

This method performs an operation.

