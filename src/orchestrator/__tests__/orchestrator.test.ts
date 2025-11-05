/**
 * Phase 3 Step 7: Orchestrator Tests
 *
 * Integration tests followed by unit tests per Phase -1 process.
 * Tests verify:
 * - All 10 phases execute in correct order
 * - Progress events emitted correctly
 * - Statistics populated after each phase
 * - Validation gates halt pipeline on failure
 * - Error handling preserves context
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Orchestrator, PipelinePhase, PipelineError } from '../orchestrator.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('Orchestrator - Integration Tests', () => {
  let testDir: string;

  beforeEach(() => {
    // Create temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ceps-orchestrator-test-'));
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should execute all 10 phases in correct order', async () => {
    // Setup: Create minimal test project
    const srcDir = path.join(testDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'app.ts'), `
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
    `.trim());

    const orchestrator = new Orchestrator(testDir);
    const phaseLog: string[] = [];

    orchestrator.on('phaseStart', (phase) => {
      phaseLog.push(phase);
    });

    await orchestrator.run();

    expect(phaseLog).toEqual([
      'scanning',
      'parsing',
      'relation-resolution',
      'graph-building',
      'reasoning',
      'ambiguity-resolution',
      'validation-pre',
      'generation',
      'validation-post',
      'complete'
    ]);
  });

  it('should populate KB after parsing phase', async () => {
    // Setup: Create test file
    const srcDir = path.join(testDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'math.ts'), `
export function add(a: number, b: number): number {
  return a + b;
}
    `.trim());

    const orchestrator = new Orchestrator(testDir);

    await orchestrator.runUntil(PipelinePhase.PARSING);

    const kb = orchestrator.getKnowledgeBase();
    const entities = kb.getAllEntities();

    expect(entities.length).toBeGreaterThan(0);
    expect(entities.some(e => e.name === 'add')).toBe(true);
  });

  it('should populate statistics after each phase', async () => {
    // Setup: Create test file
    const srcDir = path.join(testDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'util.ts'), `
export function identity<T>(x: T): T {
  return x;
}
    `.trim());

    const orchestrator = new Orchestrator(testDir);

    await orchestrator.runUntil(PipelinePhase.PARSING);
    let status = orchestrator.getStatus();
    expect(status.statistics.filesScanned).toBeGreaterThan(0);
    expect(status.statistics.entitiesFound).toBeGreaterThan(0);

    await orchestrator.runUntil(PipelinePhase.REASONING);
    status = orchestrator.getStatus();
    expect(status.statistics.chunksGenerated).toBeGreaterThan(0);
  });

  it('should emit phaseStart and phaseComplete events', async () => {
    // Setup: Create test file
    const srcDir = path.join(testDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'test.ts'), `
export const VERSION = '1.0.0';
    `.trim());

    const orchestrator = new Orchestrator(testDir);
    const events: string[] = [];

    orchestrator.on('phaseStart', (phase) => events.push(`start:${phase}`));
    orchestrator.on('phaseComplete', (phase) => events.push(`complete:${phase}`));

    await orchestrator.runUntil(PipelinePhase.PARSING);

    expect(events).toContain('start:scanning');
    expect(events).toContain('complete:scanning');
    expect(events).toContain('start:parsing');
    expect(events).toContain('complete:parsing');
  });

  it('should generate specs during generation phase', async () => {
    // Setup: Create test file with a function (constants alone may not generate factSets)
    const srcDir = path.join(testDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'config.ts'), `
export function getApiUrl(): string {
  return 'https://api.example.com';
}
    `.trim());

    const orchestrator = new Orchestrator(testDir);

    // Run through full pipeline to ensure validation passes
    await orchestrator.run();

    // Verify root spec generated
    const rootSpecPath = path.join(testDir, 'spec.md');
    expect(fs.existsSync(rootSpecPath)).toBe(true);

    const rootSpec = fs.readFileSync(rootSpecPath, 'utf8');
    expect(rootSpec).toContain('# ');
    expect(rootSpec).toContain('Specification');
  });
});

describe('Orchestrator - Error Handling', () => {
  it('should capture phase errors and halt pipeline', async () => {
    const orchestrator = new Orchestrator('/nonexistent/path');
    const errors: PipelineError[] = [];

    orchestrator.on('phaseError', (phase, error) => {
      errors.push({ phase, message: (error as Error).message });
    });

    await expect(orchestrator.run()).rejects.toThrow();

    // Verify at least one error was captured (could be scanning or generation phase)
    expect(errors.length).toBeGreaterThan(0);
    // Error should be from an early phase (scanning or generation attempting to read/write)
    expect(['scanning', 'generation', 'parsing']).toContain(errors[0].phase);
  });

  it('should record errors in status', async () => {
    const orchestrator = new Orchestrator('/nonexistent/path');

    try {
      await orchestrator.run();
    } catch (error) {
      // Expected
    }

    const status = orchestrator.getStatus();
    expect(status.errors.length).toBeGreaterThan(0);
  });
});

describe('Orchestrator - Validation Gates', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ceps-validation-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should pass validation when all entities have chunks', async () => {
    // Setup: Create test file with simple exported function
    const srcDir = path.join(testDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'simple.ts'), `
export function hello(): string {
  return 'world';
}
    `.trim());

    const orchestrator = new Orchestrator(testDir);

    // Should not throw
    await expect(orchestrator.run()).resolves.not.toThrow();

    const status = orchestrator.getStatus();
    expect(status.statistics.coverage).toBeGreaterThan(0);
  });

  it('should halt at validation-pre when coverage is below 100%', async () => {
    // Setup: Create a minimal test file
    const srcDir = path.join(testDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'app.ts'), `
export function test() {
  return 'ok';
}
    `.trim());

    const orchestrator = new Orchestrator(testDir);

    // Run through parsing to populate KB
    await orchestrator.runUntil(PipelinePhase.PARSING);

    // Manually insert an exported entity without factSets to simulate coverage gap
    const kb = orchestrator.getKnowledgeBase();
    kb.insertEntity({
      id: 'orphan-entity-test',
      kind: 'function',
      name: 'orphanFunction',
      path: 'src/orphan.ts',
      exported: true,
      visibility: 'public'
    });
    // Note: No factSets inserted for this entity, so no chunk will be generated

    const errors: string[] = [];
    orchestrator.on('phaseError', (phase, error) => {
      errors.push((error as Error).message);
    });

    // Continue from reasoning phase - should fail at validation-pre
    await expect(orchestrator.runUntil(PipelinePhase.COMPLETE)).rejects.toThrow(/Coverage gate failed/);

    // Verify error message contains entity details
    expect(errors.length).toBeGreaterThan(0);
    const errorMsg = errors[0];
    expect(errorMsg).toMatch(/Coverage gate failed/);
    expect(errorMsg).toMatch(/Missing entities:/);
    // Error should include entity kind, name, and path
    expect(errorMsg).toMatch(/function.*orphanFunction/);
    expect(errorMsg).toMatch(/at.*orphan\.ts/);

    const status = orchestrator.getStatus();
    expect(status.currentPhase).toBe(PipelinePhase.VALIDATION_PRE);
    expect(status.errors.length).toBeGreaterThan(0);
    expect(status.errors[0].phase).toBe(PipelinePhase.VALIDATION_PRE);
  });
});

describe('Orchestrator - Progress Reporting', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ceps-progress-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should track current phase in status', async () => {
    // Setup: Create test file
    const srcDir = path.join(testDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'index.ts'), `
export const APP_NAME = 'Test App';
    `.trim());

    const orchestrator = new Orchestrator(testDir);

    await orchestrator.runUntil(PipelinePhase.PARSING);
    let status = orchestrator.getStatus();
    expect(status.currentPhase).toBe(PipelinePhase.PARSING);

    await orchestrator.runUntil(PipelinePhase.REASONING);
    status = orchestrator.getStatus();
    expect(status.currentPhase).toBe(PipelinePhase.REASONING);
  });

  it('should include start time in status', async () => {
    const orchestrator = new Orchestrator(testDir);
    const status = orchestrator.getStatus();

    expect(status.startTime).toBeInstanceOf(Date);
  });
});
