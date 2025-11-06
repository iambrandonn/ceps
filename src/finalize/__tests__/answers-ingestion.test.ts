import { describe, it, expect } from 'vitest';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { ingestAnswers, parseAnswers } from '../answers.js';
import { createEntity, type OpenQuestion } from '../../kb/models.js';

function createKBWithOpenQuestion(): KnowledgeBase {
  const kb = new KnowledgeBase();
  const entityId = 'entity-1';
  // Minimal entity required for open question context
  kb.insertEntity(
    createEntity({
      id: entityId,
      kind: 'function',
      name: 'testFn',
      path: 'src/test.ts',
      exported: true,
      visibility: 'public'
    })
  );

  const openQuestion: OpenQuestion = {
    qid: 'q:TESTQID0A1',
    entityId,
    question: 'What does testFn do?',
    confidence: 30,
    factSetIds: ['fs-1']
  };
  kb.insertOpenQuestion(openQuestion);
  return kb;
}

describe('ingestAnswers', () => {
  it('attaches valid answers and reports warnings/errors', () => {
    const kb = createKBWithOpenQuestion();
    const markdown = `q:TESTQID0A1: This function performs an operation\nq:UNKN0A1B2C: Unknown entry`;
    const parseResult = parseAnswers(markdown);
    const report = ingestAnswers(kb, parseResult, {
      maxAnswerLength: 10,
      now: () => '1970-01-01T00:00:00.000Z'
    });

    expect(report.validAnswers).toHaveLength(1);
    expect(report.validAnswers[0]).toEqual({
      qid: 'q:TESTQID0A1',
      entityId: 'entity-1',
      answer: 'This function performs an operation',
      appliedAt: '1970-01-01T00:00:00.000Z',
      factSetIds: ['fs-1']
    });
    expect(report.invalidEntries).toEqual([
      { line: 2, qid: 'q:UNKN0A1B2C', error: 'Unknown QID.' }
    ]);
    expect(report.warnings).toHaveLength(1);
    expect(report.unknownQids).toEqual(['q:UNKN0A1B2C']);
    expect(report.summary).toEqual({
      totalEntries: 2,
      validCount: 1,
      invalidCount: 1,
      unknownCount: 1
    });
  });

  it('rejects duplicate QIDs and invalid format', () => {
    const kb = createKBWithOpenQuestion();
    const markdown = `q:TESTQID0A1: first\nq:TESTQID0A1: duplicate\nq:bad: invalid`;
    const parseResult = parseAnswers(markdown);
    const report = ingestAnswers(kb, parseResult, { now: () => '1970-01-01T00:00:00.000Z' });

    expect(report.validAnswers).toHaveLength(1);
    expect(report.invalidEntries).toEqual([
      { line: 2, qid: 'q:TESTQID0A1', error: 'Duplicate QID entry.' },
      { line: 3, qid: 'q:bad', error: 'Invalid QID format.' }
    ]);
  });
});
