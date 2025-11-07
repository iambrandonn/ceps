/**
 * Phase 6 I1: Express Pattern Integration Test
 *
 * End-to-end test verifying Express patterns are detected by the full reasoning pipeline.
 * Tests that PatternRegistry is properly wired into IntentLifter → Orchestrator.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Orchestrator, PipelinePhase } from '../../src/orchestrator/orchestrator.js';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

describe('Phase 6: Express Pattern Integration', () => {
  let tmpDir: string;
  let orchestrator: Orchestrator;
  let kb: KnowledgeBase;

  beforeAll(async () => {
    // Create temporary test fixture with Express code
    tmpDir = fs.mkdtempSync(path.join(tmpdir(), 'ceps-phase6-test-'));

    // Create Express middleware fixture
    const middlewareCode = `
/**
 * Authentication middleware
 */
export function authMiddleware(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
`;

    // Create Express Router fixture
    const routerCode = `
import { Router } from 'express';

export const usersRouter = Router();

usersRouter.get('/users', (req, res) => {
  res.json({ users: [] });
});

usersRouter.post('/users', (req, res) => {
  res.status(201).json({ created: true });
});

usersRouter.delete('/users/:id', (req, res) => {
  res.status(204).send();
});
`;

    fs.writeFileSync(path.join(tmpDir, 'middleware.ts'), middlewareCode);
    fs.writeFileSync(path.join(tmpDir, 'router.ts'), routerCode);

    // Initialize orchestrator with LLM off (deterministic mode)
    kb = new KnowledgeBase();
    orchestrator = new Orchestrator({
      projectRoot: tmpDir,
      llm: 'off',
      deterministic: true,
      snapshotEnabled: false,
      knowledgeBase: kb,
    });

    // Run pipeline through reasoning phase (where patterns are applied)
    await orchestrator.runUntil(PipelinePhase.REASONING);
  }, 30000);

  afterAll(() => {
    // Clean up temporary test directory
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  describe('Express Middleware Pattern', () => {
    it('should detect middleware pattern and generate behavior chunk', () => {
      // Find authMiddleware entity
      const entities = kb.getAllEntities();
      const middlewareEntity = entities.find(e => e.name === 'authMiddleware');

      expect(middlewareEntity).toBeDefined();
      expect(middlewareEntity?.kind).toBe('function');

      // Find behavior chunk for middleware
      const chunks = kb.getChunksByEntity(middlewareEntity!.id);
      expect(chunks.length).toBeGreaterThan(0);

      const chunk = chunks[0];

      // Verify chunk contains Express middleware terminology
      expect(chunk.textDraft).toMatch(/Express middleware/i);
      expect(chunk.textDraft).toContain('authMiddleware');
      expect(chunk.textDraft).toMatch(/middleware chain/i);

      // Verify confidence is High (pattern detected)
      expect(chunk.confidence).toBe('High');
    });
  });

  describe('Express Router Pattern', () => {
    it('should detect router pattern and generate behavior chunk', () => {
      // Find usersRouter entity
      const entities = kb.getAllEntities();
      const routerEntity = entities.find(e => e.name === 'usersRouter');

      expect(routerEntity).toBeDefined();
      expect(routerEntity?.kind).toBe('constant');

      // Find behavior chunk for router
      const chunks = kb.getChunksByEntity(routerEntity!.id);
      expect(chunks.length).toBeGreaterThan(0);

      const chunk = chunks[0];

      // Verify chunk contains Express Router terminology
      expect(chunk.textDraft).toMatch(/Express Router/i);
      expect(chunk.textDraft).toContain('usersRouter');
      expect(chunk.textDraft).toMatch(/route handlers/i);
    });

    it('should detect router even without route extraction (inline handlers)', () => {
      // Per Phase -1 analysis: Parser doesn't extract inline route handlers as entities.
      // The router pattern should still be detected, but routes may not be listed.
      // This is a known limitation documented in PHASE6_EXPRESS_PHASE_MINUS_ONE.md

      const entities = kb.getAllEntities();
      const routerEntity = entities.find(e => e.name === 'usersRouter');
      const chunks = kb.getChunksByEntity(routerEntity!.id);
      const chunk = chunks[0];

      // Router should be detected
      expect(chunk.textDraft).toMatch(/Express Router/i);
      expect(chunk.textDraft).toMatch(/route handlers/i);

      // Routes may or may not be listed (depends on parser facts)
      // We accept either outcome as valid
    });

    it('should have High confidence for router pattern', () => {
      const entities = kb.getAllEntities();
      const routerEntity = entities.find(e => e.name === 'usersRouter');
      const chunks = kb.getChunksByEntity(routerEntity!.id);
      const chunk = chunks[0];

      expect(chunk.confidence).toBe('High');
    });
  });

  describe('PatternRegistry Integration', () => {
    it('should prioritize PatternRegistry over legacy PatternMatcher', () => {
      // Both patterns should use PatternRegistry (Phase 6) not PatternMatcher (Phase 3)
      // We can verify this by checking that:
      // 1. Middleware chunk mentions entity name (Phase 6 feature)
      // 2. Router chunk mentions entity name (Phase 6 feature)

      const entities = kb.getAllEntities();
      const middlewareEntity = entities.find(e => e.name === 'authMiddleware');
      const routerEntity = entities.find(e => e.name === 'usersRouter');

      const middlewareChunks = kb.getChunksByEntity(middlewareEntity!.id);
      const routerChunks = kb.getChunksByEntity(routerEntity!.id);

      // Phase 6 patterns include entity name in description
      expect(middlewareChunks[0].textDraft).toContain('authMiddleware');
      expect(routerChunks[0].textDraft).toContain('usersRouter');
    });

    it('should generate at least 2 chunks (middleware + router)', () => {
      const chunks = kb.getAllChunks();

      // Should have chunks for at least authMiddleware and usersRouter
      expect(chunks.length).toBeGreaterThanOrEqual(2);
    });
  });
});
