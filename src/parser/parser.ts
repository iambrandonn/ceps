import { Project, SourceFile } from 'ts-morph';
import * as babel from '@babel/parser';
import { ParseResult, ParseError } from '../types/index.js';
import { Entity, Relation, FactSet } from '../kb/models.js';
import { FactExtractor, ExtractionResult } from './fact-extractor.js';
import { PatternDetector } from './pattern-detector.js';
import { KnowledgeBase } from '../kb/knowledge-base.js';

export class Parser {
  private project: Project;
  private factExtractor: FactExtractor;
  private patternDetector: PatternDetector;

  constructor() {
    this.project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: {
        target: 99, // ESNext
        module: 99, // ESNext
        allowJs: true,
        jsx: 2, // React
      },
    });
    this.factExtractor = new FactExtractor();
    this.patternDetector = new PatternDetector();
  }

  async parse(filePath: string, source: string): Promise<ParseResult> {
    let sourceFile: SourceFile | null = null;
    const errors: ParseError[] = [];
    let entities: Entity[] = [];
    let relations: Relation[] = [];
    let factSets: FactSet[] = [];

    try {
      // Try TypeScript compiler API first
      sourceFile = this.project.createSourceFile(filePath, source, { overwrite: true });

      // Check for parse/syntax errors
      const diagnostics = sourceFile.getPreEmitDiagnostics();
      if (diagnostics.length > 0) {
        for (const diagnostic of diagnostics) {
          const message = diagnostic.getMessageText();
          errors.push({
            filePath,
            message: typeof message === 'string' ? message : message.getMessageText(),
            severity: 'error',
            location: diagnostic.getStart() ? {
              line: sourceFile.getLineAndColumnAtPos(diagnostic.getStart()!).line,
              column: sourceFile.getLineAndColumnAtPos(diagnostic.getStart()!).column,
            } : undefined,
          });
        }
      }

      // Extract facts
      const extractResult = this.factExtractor.extract(sourceFile, filePath);
      entities = extractResult.entities;
      relations = extractResult.relations;
      factSets = extractResult.factSets;

      // Detect dynamic patterns
      const patternWarnings = this.patternDetector.detect(sourceFile, filePath);
      errors.push(...patternWarnings);
    } catch (error) {
      // Fall back to Babel
      try {
        const ast = babel.parse(source, {
          sourceType: 'module',
          plugins: ['typescript', 'jsx'],
        });

        // Extract facts from Babel AST (simplified for now)
        // TODO: Implement Babel fact extraction in future phase
        errors.push({
          filePath,
          message: 'Using Babel fallback parser (limited fact extraction)',
          severity: 'warning',
        });
      } catch (babelError) {
        errors.push({
          filePath,
          message: `Parse error: ${(error as Error).message}`,
          severity: 'error',
        });
      }
    }

    return {
      filePath,
      entities,
      relations,
      factSets,
      errors,
    };
  }

  async parseAndStore(
    filePath: string,
    source: string,
    kb: KnowledgeBase
  ): Promise<ParseResult> {
    const result = await this.parse(filePath, source);

    // Store in KB using batch transaction
    kb.beginBatch();
    try {
      for (const entity of result.entities) {
        kb.insertEntity(entity);
      }
      for (const factSet of result.factSets) {
        kb.insertFactSet(factSet);
      }
      // Store relations (imports, exports, calls)
      for (const relation of result.relations) {
        kb.insertRelation(relation);
      }
      kb.commit();
    } catch (error) {
      kb.rollback();
      throw error;
    }

    return result;
  }
}
