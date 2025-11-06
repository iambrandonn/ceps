import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { createEntity, type FactSet, type BehaviorChunk, type OpenQuestion } from '../../kb/models.js';
import { parseAnswersFromFile, ingestAnswers } from '../answers.js';
import { reanalyzeEntities, type ReanalysisOptions, type ReanalysisResult } from '../reanalysis.js';
import type { ImpactReport } from '../impact-scope.js';

const FIXTURE_ROOT = path.resolve('tests/fixtures/phase5/baseline/tiny-react');

describe('reanalyzeEntities (fixture)', () => {
  it('matches golden reanalysis output for tiny-react fixture', async () => {
    const kb = new KnowledgeBase();

    const entity = createEntity({
      id: 'QuVnACVfXW',
      kind: 'method',
      name: 'render',
      path: 'src/Card.tsx',
      exported: true,
      visibility: 'public'
    });
    kb.insertEntity(entity);

    const factSet: FactSet = {
      id: 'QuVnACVfXW-facts',
      facts: [
        { subjectId: entity.id, predicate: 'has-jsdoc', object: 'Renders card markup.' }
      ],
      sources: [],
      evidenceScore: 60
    };
    kb.insertFactSet(factSet);

    const chunk: BehaviorChunk = {
      id: 'chunk-QuVnACVfXW',
      targetEntityId: entity.id,
      textDraft: 'Method render (intent unclear from static analysis)',
      confidence: 'Low',
      factSetIds: [factSet.id]
    };
    kb.insertChunk(chunk);

    const openQuestion: OpenQuestion = {
      qid: 'q:GR0v81JJWV',
      entityId: entity.id,
      question: 'What is the behavior of method `render` at src/Card.tsx?',
      confidence: 30,
      factSetIds: [factSet.id]
    };
    kb.insertOpenQuestion(openQuestion);

    const answersParse = parseAnswersFromFile(path.join(FIXTURE_ROOT, 'answers.md'));
    ingestAnswers(kb, answersParse, { now: () => '1970-01-01T00:00:00.000Z' });

    const impactReport: ImpactReport = JSON.parse(
      fs.readFileSync(path.join(FIXTURE_ROOT, 'impact.report.json'), 'utf8')
    );

    const options: ReanalysisOptions = {
      deterministicMode: true,
      llmEnabled: false,
      reasoningEnabled: true
    };

    const result = await reanalyzeEntities(kb, impactReport, options);
    const normalized = normalizeResult(result);

    const expected = JSON.parse(
      fs.readFileSync(path.join(FIXTURE_ROOT, 'reanalysis.success.json'), 'utf8')
    );

    expect(normalized).toEqual(expected);
  });
});

function normalizeResult(result: ReanalysisResult) {
  return {
    updatedChunks: Array.from(result.updatedChunks.entries()).map(([entityId, chunk]) => ({
      entityId,
      chunk
    })),
    failedEntities: result.failedEntities,
    warnings: [...result.warnings].sort(),
    metrics: {
      ...result.metrics,
      runtimeMs: 0
    }
  };
}
