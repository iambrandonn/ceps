import { SourceFile } from 'ts-morph';
import { FactSet, Fact } from '../../kb/models.js';

export class TestReader {
  extractFacts(sourceFile: SourceFile, filePath: string): FactSet[] {
    const factSets: FactSet[] = [];
    const facts: Fact[] = [];

    // Extract test names from describe/it blocks
    sourceFile.forEachDescendant((node) => {
      const text = node.getText();

      if (text.includes('describe(') || text.includes('it(') || text.includes('test(')) {
        const match = text.match(/['"`]([^'"`]+)['"`]/);
        if (match) {
          facts.push({
            subjectId: filePath,
            predicate: 'test-case',
            object: match[1],
          });
        }
      }
    });

    if (facts.length > 0) {
      factSets.push({
        id: `${filePath}-test-facts`,
        facts,
        sources: [{ kind: 'aux', file: filePath, reader: 'test-reader' }],
        evidenceScore: 70, // Medium confidence for test intent
      });
    }

    return factSets;
  }
}
