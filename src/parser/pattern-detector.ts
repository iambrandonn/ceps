import { SourceFile, SyntaxKind } from 'ts-morph';
import { ParseError } from '../types/index.js';

const DYNAMIC_PATTERNS = [
  { pattern: /\beval\s*\(/, message: 'eval() reduces static resolvability' },
  {
    pattern: /\bnew\s+Function\s*\(/,
    message: 'Function constructor reduces static resolvability',
  },
  { pattern: /\bnew\s+Proxy\s*\(/, message: 'Proxy usage may obscure property access' },
  {
    pattern: /\bReflect\.(get|set|has)\b/,
    message: 'Reflect API may obscure access patterns',
  },
  {
    pattern: /\[.*\]\s*=/,
    message: 'Bracket notation on unknown object reduces resolvability',
  },
  {
    pattern: /import\s*\(/,
    message: 'dynamic import() detected - may reduce static resolvability',
  },
];

export class PatternDetector {
  detect(sourceFile: SourceFile, filePath: string): ParseError[] {
    const warnings: ParseError[] = [];
    const text = sourceFile.getFullText();

    // Check for dynamic patterns using regex
    for (const { pattern, message } of DYNAMIC_PATTERNS) {
      if (pattern.test(text)) {
        warnings.push({
          filePath,
          message: `Dynamic pattern detected: ${message}`,
          severity: 'warning',
        });
      }
    }

    return warnings;
  }
}
