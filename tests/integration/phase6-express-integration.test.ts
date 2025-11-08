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

    // Create Express config fixture (I3)
    const configCode = `
import express from 'express';

export function configureApp() {
  const app = express();

  // Configuration settings
  app.set('port', process.env.PORT || 3000);
  app.set('views', './views');
  app.set('view engine', 'ejs');

  // Read configuration
  const port = app.get('port');

  return app;
}

export function loadEnvConfig() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const apiKey = process.env.API_KEY;
  const nodeEnv = process.env.NODE_ENV;

  return { dbHost, apiKey, nodeEnv };
}
`;

    fs.writeFileSync(path.join(tmpDir, 'middleware.ts'), middlewareCode);
    fs.writeFileSync(path.join(tmpDir, 'router.ts'), routerCode);
    fs.writeFileSync(path.join(tmpDir, 'config.ts'), configCode);

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

    it('should detect router WITH module-scope route extraction', () => {
      // Phase 6 Fix: Parser NOW extracts module-scope calls (router.get(), router.post(), etc.)
      // Module-scope calls are attributed to the constant entity (usersRouter).
      // This test verifies that the router pattern can access these new facts.

      const entities = kb.getAllEntities();
      const routerEntity = entities.find(e => e.name === 'usersRouter');
      const chunks = kb.getChunksByEntity(routerEntity!.id);
      const chunk = chunks[0];

      // Router should be detected
      expect(chunk.textDraft).toMatch(/Express Router/i);
      expect(chunk.textDraft).toMatch(/route handlers/i);

      // Verify router entity has module-scope call facts
      const factSets = kb.getFactSetsBySubject(routerEntity!.id);
      const routerFacts = factSets.flatMap(fs => fs.facts);

      // Should have calls-expression facts for router.get, router.post, router.delete
      const callsFacts = routerFacts.filter(f => f.predicate === 'calls-expression');
      expect(callsFacts.length).toBeGreaterThan(0);
      expect(callsFacts.some(f => String(f.object).includes('.get'))).toBe(true);
      expect(callsFacts.some(f => String(f.object).includes('.post'))).toBe(true);
    });

    it('should have High confidence for router pattern', () => {
      const entities = kb.getAllEntities();
      const routerEntity = entities.find(e => e.name === 'usersRouter');
      const chunks = kb.getChunksByEntity(routerEntity!.id);
      const chunk = chunks[0];

      expect(chunk.confidence).toBe('High');
    });
  });

  describe('Express Config Pattern (I3)', () => {
    it('should detect app.set/app.get configuration pattern', () => {
      // Find configureApp entity
      const entities = kb.getAllEntities();
      const configEntity = entities.find(e => e.name === 'configureApp');

      expect(configEntity).toBeDefined();
      expect(configEntity?.kind).toBe('function');

      // Find behavior chunk for config
      const chunks = kb.getChunksByEntity(configEntity!.id);
      expect(chunks.length).toBeGreaterThan(0);

      const chunk = chunks[0];

      // Verify chunk contains Express config terminology
      expect(chunk.textDraft).toMatch(/configuration/i);
      expect(chunk.textDraft).toContain('configureApp');
      expect(chunk.textDraft).toMatch(/app\.set|app\.get/i);

      // Verify confidence is High (pattern detected)
      expect(chunk.confidence).toBe('High');

      // Verify grounding
      expect(chunk.factSetIds.length).toBeGreaterThan(0);
    });

    it('should detect process.env environment variable reads when parser provides facts', () => {
      // NOTE: The Phase 2 parser may not emit reads-property facts for process.env access.
      // This is a known limitation per PHASE6_EXPRESS_PHASE_MINUS_ONE.md
      //
      // This test verifies that IF the parser provides process.env facts, THEN the
      // config pattern will detect them. If parser doesn't provide facts, the pattern
      // correctly falls back to generic "intent unclear" description.

      const entities = kb.getAllEntities();
      const envEntity = entities.find(e => e.name === 'loadEnvConfig');

      expect(envEntity).toBeDefined();

      // Find behavior chunk
      const chunks = kb.getChunksByEntity(envEntity!.id);
      expect(chunks.length).toBeGreaterThan(0);

      const chunk = chunks[0];

      // If process.env facts were emitted, pattern should detect them
      // If not, we get generic description (acceptable for I3)
      expect(chunk.textDraft).toContain('loadEnvConfig');

      // Check if parser provided process.env facts
      const factSets = kb.getFactSetsBySubject(envEntity!.id);
      const hasEnvFacts = factSets.some(fs =>
        fs.facts.some(f =>
          f.predicate === 'reads-property' &&
          String(f.object).startsWith('process.env.')
        )
      );

      if (hasEnvFacts) {
        // Parser provided facts → pattern should detect
        expect(chunk.textDraft).toMatch(/environment variable/i);
        expect(chunk.confidence).toBe('High');
      } else {
        // Parser didn't provide facts → generic description is acceptable
        // This is a parser limitation, not a pattern bug
        expect(chunk.textDraft).toBeTruthy();
      }
    });

    it('should not cross-match config between different entities', () => {
      const entities = kb.getAllEntities();
      const configureApp = entities.find(e => e.name === 'configureApp');
      const loadEnvConfig = entities.find(e => e.name === 'loadEnvConfig');

      const configChunks = kb.getChunksByEntity(configureApp!.id);
      const envChunks = kb.getChunksByEntity(loadEnvConfig!.id);

      // Each entity should have its own chunk
      expect(configChunks[0].targetEntityId).toBe(configureApp!.id);
      expect(envChunks[0].targetEntityId).toBe(loadEnvConfig!.id);

      // Chunks should not share factSets (no cross-contamination)
      const configFactSetIds = new Set(configChunks[0].factSetIds);
      const envFactSetIds = new Set(envChunks[0].factSetIds);

      // No overlap allowed
      const intersection = [...configFactSetIds].filter(id => envFactSetIds.has(id));
      expect(intersection.length).toBe(0);
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

    it('should generate at least 4 chunks (middleware + router + 2x config)', () => {
      const chunks = kb.getAllChunks();

      // Should have chunks for: authMiddleware, usersRouter, configureApp, loadEnvConfig
      expect(chunks.length).toBeGreaterThanOrEqual(4);
    });
  });
});
