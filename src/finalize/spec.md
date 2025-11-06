# src/finalize

**Directory Overview:** This directory contains 3 entities.

## answers.ts

<a id="A3G816X7je"></a>

### parseAnswers

**Signature:** `(markdown: string, _options: AnswerParseOptions = {}): import("/src/finalize/answers").AnswerParseResult`

**Visibility:** Public (exported)

This function performs an operation.

<a id="ieCddpmuTx"></a>

### parseAnswersFromFile

**Signature:** `(filePath: string, options: AnswerParseOptions = {}): import("/src/finalize/answers").AnswerParseResult`

**Visibility:** Public (exported)

This function performs an operation.

**Side effects:**
- filesystem

**Errors thrown:**
- new Error(`Failed to read answers file at ${absolute}: ${message}`);

<a id="fnHuvuBa3b"></a>

### ingestAnswers

**Signature:** `(kb: KnowledgeBase, parseResult: AnswerParseResult, options: AnswerIngestionOptions = {}): import("/src/finalize/answers").AnswerIngestionReport`

**Visibility:** Public (exported)

This function performs an operation.

