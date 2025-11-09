/**
 * Integration test: Express Router with Qualified Import
 *
 * Tests end-to-end flow: Parser → KB → Pattern Matcher
 * Verifies that real parser output (express.Router) works with pattern matching.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import { Parser } from '../../src/parser/parser.js';
import { ExpressRouterPattern } from '../../src/reasoning/patterns/express/router.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Express Router - Qualified Import (Integration)', () => {
  let tmpDir: string;
  let testFilePath: string;

  beforeAll(async () => {
    // Create temp directory for test files
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ceps-test-'));
  });

  afterAll(async () => {
    // Clean up temp directory
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('should detect routes with qualified import (express.Router)', async () => {
    // ARRANGE: Create realistic test file with qualified import
    const testCode = `
import express from 'express';

const router = express.Router();

router.post('/users', createUser);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router;
`;

    testFilePath = path.join(tmpDir, 'qualified-router.js');
    await fs.writeFile(testFilePath, testCode, 'utf-8');

    // ACT: Parse and analyze
    const kb = new KnowledgeBase();
    const parser = new Parser({ moduleScopeCalls: true });
    const result = await parser.parse(testFilePath, testCode);

    // Add parsed entities and facts to KB
    for (const entity of result.entities) {
      kb.insertEntity(entity);
    }
    for (const factSet of result.factSets) {
      kb.insertFactSet(factSet);
    }

    // Find the router entity
    const routerEntity = result.entities.find(e => e.name === 'router');
    expect(routerEntity).toBeDefined();
    expect(routerEntity?.kind).toBe('constant');

    // ASSERT: Pattern should match
    const pattern = new ExpressRouterPattern();
    expect(pattern.matches(kb, routerEntity!)).toBe(true);

    // Generate behavior chunks
    const chunks = pattern.describe(kb, routerEntity!);
    expect(chunks.length).toBeGreaterThan(0);

    const behaviorText = chunks[0].textDraft;

    // Should document all 4 routes
    expect(behaviorText).toContain('POST');
    expect(behaviorText).toContain('GET');
    expect(behaviorText).toContain('PUT');
    expect(behaviorText).toContain('DELETE');
    expect(behaviorText).toContain('/users');
  });

  it('should detect routes with namespace import (myExpress.Router)', async () => {
    // ARRANGE: Create test file with namespace import
    const testCode = `
import * as myExpress from 'express';

const router = myExpress.Router();

router.get('/products', getProducts);
router.post('/products', createProduct);

export default router;
`;

    testFilePath = path.join(tmpDir, 'namespace-router.js');
    await fs.writeFile(testFilePath, testCode, 'utf-8');

    // ACT: Parse and analyze
    const kb = new KnowledgeBase();
    const parser = new Parser({ moduleScopeCalls: true });
    const result = await parser.parse(testFilePath, testCode);

    for (const entity of result.entities) {
      kb.insertEntity(entity);
    }
    for (const factSet of result.factSets) {
      kb.insertFactSet(factSet);
    }

    const routerEntity = result.entities.find(e => e.name === 'router');
    expect(routerEntity).toBeDefined();

    // ASSERT: Pattern should match namespace imports too
    const pattern = new ExpressRouterPattern();
    expect(pattern.matches(kb, routerEntity!)).toBe(true);

    const chunks = pattern.describe(kb, routerEntity!);
    expect(chunks.length).toBeGreaterThan(0);

    const behaviorText = chunks[0].textDraft;
    expect(behaviorText).toContain('GET');
    expect(behaviorText).toContain('POST');
    expect(behaviorText).toContain('/products');
  });

  it('should still work with bare import (backward compatibility)', async () => {
    // ARRANGE: Create test file with named import
    const testCode = `
import { Router } from 'express';

const router = Router();

router.get('/orders', getOrders);

export default router;
`;

    testFilePath = path.join(tmpDir, 'bare-router.js');
    await fs.writeFile(testFilePath, testCode, 'utf-8');

    // ACT: Parse and analyze
    const kb = new KnowledgeBase();
    const parser = new Parser({ moduleScopeCalls: true });
    const result = await parser.parse(testFilePath, testCode);

    for (const entity of result.entities) {
      kb.insertEntity(entity);
    }
    for (const factSet of result.factSets) {
      kb.insertFactSet(factSet);
    }

    const routerEntity = result.entities.find(e => e.name === 'router');
    expect(routerEntity).toBeDefined();

    // ASSERT: Original bare import style should still work
    const pattern = new ExpressRouterPattern();
    expect(pattern.matches(kb, routerEntity!)).toBe(true);

    const chunks = pattern.describe(kb, routerEntity!);
    expect(chunks.length).toBeGreaterThan(0);

    const behaviorText = chunks[0].textDraft;
    expect(behaviorText).toContain('GET');
    expect(behaviorText).toContain('/orders');
  });
});
