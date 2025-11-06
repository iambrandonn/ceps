# src/finalize

**Directory Overview:** This directory contains 6 entities.

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

## impact-scope.ts

<a id="bb3mpB2vtc"></a>

### computeImpactReport

**Signature:** `(kb: KnowledgeBase, resolvedQids: string[], options: ImpactScopeOptions = {}): import("/src/finalize/impact-scope").ImpactReport`

**Visibility:** Public (exported)

This function computes values.

## reanalysis.ts

<a id="93hgptxV55"></a>

### reanalyzeEntities

**Signature:** `(kb: KnowledgeBase, impactReport: ImpactReport, options: ReanalysisOptions): Promise<import("/src/finalize/reanalysis").ReanalysisResult>`

**Visibility:** Public (exported)

This function performs an operation.

**Side effects:**
- filesystem

<a id="3jaaI8o5VJ"></a>

### SnapshotMismatchError

**Visibility:** Public (exported)

This class represents snapshot mismatch error.

