# src/parser

**Directory Overview:** This directory contains 7 entities.

## fact-extractor.ts

<a id="XjPGdYzYDy"></a>

### FactExtractor

**Visibility:** Public (exported)

**Behavior:**

- Class FactExtractor (intent unclear from static analysis)

**Open Questions:**
- q:RDFNjeoeUa: What are the responsibilities and contract of class `FactExtractor` at src/parser/fact-extractor.ts?

<a id="bmEJ6uoIF5"></a>

### extract

**Signature:** `(sourceFile: SourceFile, filePath: string): import("/src/parser/fact-extractor").ExtractionResult`

**Visibility:** Public (exported)

**Behavior:**

- Performs Mongoose read query (find): factSets (model not resolved).

**Side effects:**
- filesystem

**Open Questions:**
- q:PLP70bRz4N: What is the behavior of method `extract` at src/parser/fact-extractor.ts?

## parser.ts

<a id="b2geOqNq9i"></a>

### Parser

**Visibility:** Public (exported)

**Behavior:**

- Class Parser (intent unclear from static analysis)

**Open Questions:**
- q:jyKvCt0iBa: What are the responsibilities and contract of class `Parser` at src/parser/parser.ts?

<a id="YncxQwOTAS"></a>

### parse

**Signature:** `(filePath: string, source: string): Promise<ParseResult>`

**Visibility:** Public (exported)

**Behavior:**

- Method parse (intent unclear from static analysis)

**Open Questions:**
- q:xocsFnLR92: What is the behavior of method `parse` at src/parser/parser.ts?

<a id="rhGK98lAf1"></a>

### parseAndStore

**Signature:** `(filePath: string, source: string, kb: KnowledgeBase): Promise<ParseResult>`

**Visibility:** Public (exported)

**Behavior:**

- Method parseAndStore (intent unclear from static analysis)

**Errors thrown:**
- error;

## pattern-detector.ts

<a id="Za7aaQRcI2"></a>

### PatternDetector

**Visibility:** Public (exported)

**Behavior:**

- Class PatternDetector (intent unclear from static analysis)

**Open Questions:**
- q:Is53NWfBmu: What are the responsibilities and contract of class `PatternDetector` at src/parser/pattern-detector.ts?

<a id="AoGp4Jl2zi"></a>

### detect

**Signature:** `(sourceFile: SourceFile, filePath: string): ParseError[]`

**Visibility:** Public (exported)

**Behavior:**

- Method detect (intent unclear from static analysis)

**Open Questions:**
- q:LjNCu0CiSE: What is the behavior of method `detect` at src/parser/pattern-detector.ts?

