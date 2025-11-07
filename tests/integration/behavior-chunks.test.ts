import { describe, it, expect } from 'vitest';
import { Orchestrator, PipelinePhase } from '../../src/orchestrator/orchestrator';

// Ensures deterministic (LLM-off) runs continue to emit behavior chunks, guarding against
// regressions where coverage silently drops to zero.
describe('Behavior extraction coverage', () => {
  it('produces behavior chunks for exported entities without LLM support', async () => {
    const orchestrator = new Orchestrator({
      projectRoot: '.',
      llm: 'off',
      deterministic: true,
      snapshotEnabled: false,
    });

    await orchestrator.runUntil(PipelinePhase.REASONING);
    const kb = orchestrator.getKnowledgeBase();
    const exported = kb.listExported();
    const chunks = kb.getAllChunks();

    expect(exported.length).toBeGreaterThan(0);
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.length).toBeGreaterThanOrEqual(exported.length);
    for (const chunk of chunks.slice(0, 10)) {
      expect(chunk.textDraft).toBeTruthy();
    }
  }, 120000);
});
