/**
 * Phase 6 I2: Error Handler Integration Test
 *
 * End-to-end test verifying error handler patterns are detected by the full reasoning pipeline.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Orchestrator, PipelinePhase } from '../../src/orchestrator/orchestrator.js';
import { KnowledgeBase } from '../../src/kb/knowledge-base.js';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

describe('Phase 6 I2: Error Handler Integration', () => {
  let tmpDir: string;
  let orchestrator: Orchestrator;
  let kb: KnowledgeBase;

  beforeAll(async () => {
    // Create temporary test fixture with error handler
    tmpDir = fs.mkdtempSync(path.join(tmpdir(), 'ceps-phase6-i2-'));

    // Create error handler fixture
    const errorHandlerCode = `
/**
 * Global error handler middleware
 */
export function errorHandler(err, req, res, next) {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
}
`;

    // Create standard middleware for contrast
    const authCode = `
/**
 * Authentication middleware
 */
export function authMiddleware(req, res, next) {
  if (!req.headers.authorization) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}
`;

    fs.writeFileSync(path.join(tmpDir, 'error-handler.ts'), errorHandlerCode);
    fs.writeFileSync(path.join(tmpDir, 'auth.ts'), authCode);

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

  describe('Error Handler Pattern Detection', () => {
    it('should detect 4-param error handler', () => {
      const entities = kb.getAllEntities();
      const errorHandler = entities.find(e => e.name === 'errorHandler');

      expect(errorHandler).toBeDefined();
      expect(errorHandler?.kind).toBe('function');

      // Find behavior chunk for error handler
      const chunks = kb.getChunksByEntity(errorHandler!.id);
      expect(chunks.length).toBeGreaterThan(0);

      const chunk = chunks[0];

      // Verify chunk contains error handler terminology
      expect(chunk.textDraft).toMatch(/Express error handler/i);
      expect(chunk.textDraft).toContain('errorHandler');
      expect(chunk.textDraft).toMatch(/middleware/i);

      // Verify confidence is High (pattern detected with +10 adjustment)
      expect(chunk.confidence).toBe('High');
    });

    it('should NOT detect standard middleware as error handler', () => {
      const entities = kb.getAllEntities();
      const authMiddleware = entities.find(e => e.name === 'authMiddleware');

      expect(authMiddleware).toBeDefined();

      const chunks = kb.getChunksByEntity(authMiddleware!.id);
      expect(chunks.length).toBeGreaterThan(0);

      const chunk = chunks[0];

      // Should be detected as standard middleware, NOT error handler
      expect(chunk.textDraft).toMatch(/Express middleware/i);
      expect(chunk.textDraft).not.toMatch(/error handler/i);
      expect(chunk.textDraft).not.toMatch(/4-param/i);
    });
  });

  describe('Pattern Priority', () => {
    it('should generate at least 2 chunks (error handler + middleware)', () => {
      const chunks = kb.getAllChunks();

      // Should have chunks for errorHandler and authMiddleware
      expect(chunks.length).toBeGreaterThanOrEqual(2);
    });

    it('should distinguish between 3-param and 4-param middleware', () => {
      const entities = kb.getAllEntities();
      const errorHandler = entities.find(e => e.name === 'errorHandler');
      const authMiddleware = entities.find(e => e.name === 'authMiddleware');

      const errorChunks = kb.getChunksByEntity(errorHandler!.id);
      const authChunks = kb.getChunksByEntity(authMiddleware!.id);

      // Both should have chunks
      expect(errorChunks.length).toBeGreaterThan(0);
      expect(authChunks.length).toBeGreaterThan(0);

      // Error handler should mention "error" or "4-param"
      const errorText = errorChunks[0].textDraft.toLowerCase();
      expect(errorText).toMatch(/error|4-param/);

      // Standard middleware should mention "middleware" but not "error handler"
      const authText = authChunks[0].textDraft.toLowerCase();
      expect(authText).toMatch(/middleware/);
      expect(authText).not.toMatch(/error handler/);
    });
  });

  describe('Grounding & Confidence', () => {
    it('should include factSet IDs for grounding', () => {
      const entities = kb.getAllEntities();
      const errorHandler = entities.find(e => e.name === 'errorHandler');
      const chunks = kb.getChunksByEntity(errorHandler!.id);

      expect(chunks[0].factSetIds).toBeDefined();
      expect(chunks[0].factSetIds.length).toBeGreaterThan(0);
    });

    it('should have High confidence for error handlers', () => {
      const entities = kb.getAllEntities();
      const errorHandler = entities.find(e => e.name === 'errorHandler');
      const chunks = kb.getChunksByEntity(errorHandler!.id);

      expect(chunks[0].confidence).toBe('High');
    });
  });
});
