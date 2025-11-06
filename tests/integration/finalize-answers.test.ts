import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseAnswersFromFile, ingestAnswers } from '../../src/finalize/answers.js';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import { createEntity } from '../../src/kb/models.js';

const fixtureDir = path.resolve('tests/fixtures/phase5/baseline/tiny-react');

function buildKnowledgeBaseFromFixture(): KnowledgeBase {
  const kb = new KnowledgeBase();
  const qidsPath = path.join(fixtureDir, 'qids.json');
  const qids = JSON.parse(fs.readFileSync(qidsPath, 'utf8'));

  for (const q of qids) {
    kb.insertEntity(
      createEntity({
        id: q.entityId,
        kind: 'function',
        name: q.entityId,
        path: 'src/tiny-react.ts'
      })
    );
    kb.insertOpenQuestion({
      qid: q.qid,
      entityId: q.entityId,
      question: q.question,
      confidence: 30,
      factSetIds: q.factSetIds
    });
  }

  return kb;
}

describe('answers.md ingestion (integration)', () => {
  it('parses and ingests answers fixture deterministically', () => {
    const answersPath = path.join(fixtureDir, 'answers.md');
    const parseResult = parseAnswersFromFile(answersPath);

    const parseGoldenPath = path.join(fixtureDir, 'answers.parse.json');
    const parseGolden = JSON.parse(fs.readFileSync(parseGoldenPath, 'utf8'));
    expect(parseResult).toEqual(parseGolden);

    const kb = buildKnowledgeBaseFromFixture();
    const report = ingestAnswers(kb, parseResult, {
      now: () => '1970-01-01T00:00:00.000Z'
    });

    const reportGoldenPath = path.join(fixtureDir, 'answers.report.json');
    const reportGolden = JSON.parse(fs.readFileSync(reportGoldenPath, 'utf8'));
    expect(report).toEqual(reportGolden);
  });
});
