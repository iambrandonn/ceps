import { SourceFile, SyntaxKind, Node, CallExpression } from 'ts-morph';
import { Entity, Relation, FactSet, Fact } from '../kb/models.js';
import { Source } from '../types/index.js';
import { generateAnchor } from '../kb/id-generation.js';

export interface ExtractionResult {
  entities: Entity[];
  relations: Relation[];
  factSets: FactSet[];
}

export class FactExtractor {
  private existingAnchors: Set<string> = new Set();

  extract(sourceFile: SourceFile, filePath: string): ExtractionResult {
    const entities: Entity[] = [];
    const relations: Relation[] = [];
    const factSets: FactSet[] = [];

    // Extract functions
    sourceFile.getFunctions().forEach((func) => {
      const name = func.getName() || '<anonymous>';
      const isExported = func.isExported();

      // Build signature from parameters and return type
      const params = func.getParameters().map(p => p.getText()).join(', ');
      const returnType = func.getReturnType().getText();
      const signature = `(${params}): ${returnType}`;

      // v1.3 FIX: Use function body content for anchor, NOT filePath
      const content = func.getText();
      const entityId = generateAnchor(name, content, this.existingAnchors);
      this.existingAnchors.add(entityId);

      const entity: Entity = {
        id: entityId,
        kind: 'function',
        name,
        path: filePath,
        signature,
        exported: isExported,
        visibility: isExported ? 'public' : 'internal',
        attributes: {
          sideEffects: this.detectSideEffects(func),
          errors: this.detectErrors(func),
        },
      };

      entities.push(entity);

      // Create factSet
      const facts: Fact[] = [
        { subjectId: entityId, predicate: 'is-function', object: true },
        { subjectId: entityId, predicate: 'has-signature', object: signature },
      ];

      const jsdoc = func.getJsDocs();
      if (jsdoc.length > 0) {
        facts.push({
          subjectId: entityId,
          predicate: 'has-jsdoc',
          object: jsdoc[0].getDescription(),
        });
      }

      factSets.push({
        id: `${entityId}-facts`,
        facts,
        sources: [{ kind: 'ast', file: filePath }],
        evidenceScore: 90, // High confidence for direct AST extraction
      });

      // v1.3 FIX: Extract call relations INSIDE function loop to reuse entityId
      // This avoids creating duplicate anchors for the same function
      func.forEachDescendant((node) => {
        if (node.getKind() === SyntaxKind.CallExpression) {
          const callExpr = node as CallExpression;
          const calleeExpr = callExpr.getExpression().getText();

          // Create call relation (this function → callee)
          relations.push({
            subjectId: entityId, // Use existing entity ID (not a new anchor)
            predicate: 'calls',
            objectId: calleeExpr, // Simplified; Phase 3 will resolve to entity IDs
            source: { kind: 'ast', file: filePath },
          });
        }
      });
    });

    // Extract classes
    sourceFile.getClasses().forEach((cls) => {
      const name = cls.getName() || '<anonymous>';
      const isExported = cls.isExported();

      // v1.3 FIX: Use content-based anchoring (consistent with functions)
      const content = cls.getText();
      const entityId = generateAnchor(name, content, this.existingAnchors);
      this.existingAnchors.add(entityId);

      entities.push({
        id: entityId,
        kind: 'class',
        name,
        path: filePath,
        exported: isExported,
        visibility: isExported ? 'public' : 'internal',
      });

      // Extract methods (skip private methods - they shouldn't be in public API)
      cls.getMethods().forEach((method) => {
        // Skip private methods - they're implementation details, not public API
        if (method.hasModifier(SyntaxKind.PrivateKeyword)) {
          return;
        }

        const methodName = method.getName();

        // v1.3 FIX: Use content-based anchoring (consistent with functions)
        const methodContent = method.getText();
        const methodId = generateAnchor(
          `${name}.${methodName}`,
          methodContent,
          this.existingAnchors
        );
        this.existingAnchors.add(methodId);

        // Build signature from parameters and return type
        const params = method.getParameters().map(p => p.getText()).join(', ');
        const returnType = method.getReturnType().getText();
        const methodSignature = `(${params}): ${returnType}`;

        entities.push({
          id: methodId,
          kind: 'method',
          name: methodName,
          path: filePath,
          signature: methodSignature,
          exported: isExported, // Methods inherit class visibility
          visibility: isExported ? 'public' : 'internal',
          attributes: {
            sideEffects: this.detectSideEffects(method),
            errors: this.detectErrors(method),
          },
        });

        // v1.3 FIX: Extract call relations for methods (similar to functions)
        method.forEachDescendant((node) => {
          if (node.getKind() === SyntaxKind.CallExpression) {
            const callExpr = node as CallExpression;
            const calleeExpr = callExpr.getExpression().getText();

            // Create call relation (this method → callee)
            relations.push({
              subjectId: methodId, // Use existing method ID (not a new anchor)
              predicate: 'calls',
              objectId: calleeExpr, // Simplified; Phase 3 will resolve to entity IDs
              source: { kind: 'ast', file: filePath },
            });
          }
        });
      });
    });

    // Extract imports
    sourceFile.getImportDeclarations().forEach((imp) => {
      const moduleSpecifier = imp.getModuleSpecifierValue();

      relations.push({
        subjectId: filePath,
        predicate: 'imports',
        objectId: moduleSpecifier,
        source: { kind: 'ast', file: filePath },
      });
    });

    // Extract exports
    sourceFile.getExportDeclarations().forEach((exp) => {
      const moduleSpecifier = exp.getModuleSpecifierValue();

      if (moduleSpecifier) {
        relations.push({
          subjectId: filePath,
          predicate: 'exports',
          objectId: moduleSpecifier,
          source: { kind: 'ast', file: filePath },
        });
      }
    });

    // Extract variable declarations (constants, let, var)
    sourceFile.getVariableDeclarations().forEach((varDecl) => {
      const name = varDecl.getName();
      const parent = varDecl.getParent();
      const grandparent = parent?.getParent();

      // Check if exported at statement level
      const isExported = grandparent?.getKind() === SyntaxKind.VariableStatement &&
        (grandparent as any).isExported?.() === true;

      const content = varDecl.getText();
      const entityId = generateAnchor(name, content, this.existingAnchors);
      this.existingAnchors.add(entityId);

      entities.push({
        id: entityId,
        kind: 'constant',
        name,
        path: filePath,
        exported: isExported,
        visibility: isExported ? 'public' : 'internal',
      });
    });

    return { entities, relations, factSets };
  }

  private detectSideEffects(node: Node): string[] {
    const sideEffects: string[] = [];
    const text = node.getText();

    // Network calls
    if (
      text.includes('fetch(') ||
      text.includes('axios.') ||
      text.includes('http.')
    ) {
      sideEffects.push('network');
    }

    // Storage
    if (text.includes('localStorage') || text.includes('sessionStorage')) {
      sideEffects.push('storage');
    }

    // File I/O
    if (
      text.includes('fs.') ||
      text.includes('readFile') ||
      text.includes('writeFile')
    ) {
      sideEffects.push('filesystem');
    }

    // Database
    if (
      text.includes('prisma.') ||
      text.includes('.query(') ||
      text.includes('.execute(')
    ) {
      sideEffects.push('database');
    }

    return sideEffects;
  }

  private detectErrors(node: Node): string[] {
    const errors: string[] = [];

    node.forEachDescendant((descendant) => {
      if (descendant.getKind() === SyntaxKind.ThrowStatement) {
        const throwText = descendant.getText();
        errors.push(throwText.replace('throw ', '').trim());
      }
    });

    return errors;
  }
}
