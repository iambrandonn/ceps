/**
 * Phase 4 WS-F1 Stage G.2: Adversarial Suite Automation
 *
 * Automated test runner for adversarial scenarios in fixtures/adversarial/phase4/
 * Tests validator against deliberately crafted failure cases.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { GroundingValidator } from '../grounding-validator.js';
import { KnowledgeBase } from '../../kb/knowledge-base.js';
import { createEntity } from '../../kb/models.js';
import type { Entity, FactSet, ChunkMetadata } from '../../kb/models.js';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

interface AdversarialScenario {
  name: string;
  description: string;
  category: string;
  severity: string;
  expectedOutcome: 'accept' | 'retry' | 'fallback';
  draftText: string;
  factSetIds: string[];
  metadata: ChunkMetadata;
  expectedDiagnostics: Array<{
    rule: string;
    reasonPattern: string;
  }>;
  notes?: string;
}

interface BaselineData {
  factSets: FactSet[];
  entities: Entity[];
}

describe('Adversarial Suite (Automated)', () => {
  let kb: KnowledgeBase;
  let validator: GroundingValidator;
  let baseline: BaselineData;

  const ADVERSARIAL_DIR = 'fixtures/adversarial/phase4';
  const BASELINE_PATH = join(ADVERSARIAL_DIR, 'baseline', 'factSets-high.json');

  beforeAll(() => {
    // Load baseline data
    const baselineContent = readFileSync(BASELINE_PATH, 'utf-8');
    baseline = JSON.parse(baselineContent) as BaselineData;

    // Initialize KB with baseline entities and factSets
    kb = new KnowledgeBase();
    for (const entity of baseline.entities) {
      kb.insertEntity(createEntity(entity));
    }
    for (const factSet of baseline.factSets) {
      kb.insertFactSet(factSet);
    }

    validator = new GroundingValidator(kb);
  });

  // Discover all scenario directories
  const scenarioDirs = readdirSync(ADVERSARIAL_DIR, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== 'baseline')
    .map(dirent => dirent.name);

  // Generate a test for each scenario
  for (const scenarioDir of scenarioDirs) {
    const scenarioPath = join(ADVERSARIAL_DIR, scenarioDir, 'scenario.json');
    let scenario: AdversarialScenario;

    try {
      const scenarioContent = readFileSync(scenarioPath, 'utf-8');
      scenario = JSON.parse(scenarioContent) as AdversarialScenario;
    } catch (error) {
      // Skip if scenario.json doesn't exist or is malformed
      continue;
    }

    it(`should reject: ${scenario.name}`, () => {
      const result = validator.validate(
        scenario.draftText,
        scenario.factSetIds,
        scenario.metadata
      );

      // Debug output
      if (result.status !== scenario.expectedOutcome || result.diagnostics.length === 0) {
        console.log(`\nScenario: ${scenario.name}`);
        console.log(`Expected: ${scenario.expectedOutcome}, Got: ${result.status}`);
        console.log(`Diagnostics (${result.diagnostics.length}):`, JSON.stringify(result.diagnostics, null, 2));
      }

      // Assert expected outcome
      expect(result.status).toBe(scenario.expectedOutcome);

      // Assert at least one diagnostic if not accepting
      if (scenario.expectedOutcome !== 'accept') {
        expect(result.diagnostics.length).toBeGreaterThan(0);
      }

      // Assert expected diagnostic rules and patterns
      for (const expectedDiag of scenario.expectedDiagnostics) {
        const matchingDiag = result.diagnostics.find(
          d =>
            d.rule === expectedDiag.rule &&
            new RegExp(expectedDiag.reasonPattern, 'i').test(d.reason)
        );

        if (!matchingDiag) {
          console.log(`\nExpected diagnostic not found:`);
          console.log(`  Rule: ${expectedDiag.rule}, Pattern: ${expectedDiag.reasonPattern}`);
          console.log(`  Actual diagnostics:`, result.diagnostics.map(d => ({ rule: d.rule, reason: d.reason })));
        }

        expect(matchingDiag).toBeDefined();
        if (matchingDiag) {
          expect(matchingDiag.rule).toBe(expectedDiag.rule);
        }
      }
    });
  }

  // Summary test: ensure we have scenarios
  it('should have loaded adversarial scenarios', () => {
    expect(scenarioDirs.length).toBeGreaterThan(0);
  });

  // Rejection rate test: all adversarial scenarios should fail validation
  it('should reject 100% of adversarial scenarios', () => {
    let totalScenarios = 0;
    let rejectedScenarios = 0;

    for (const scenarioDir of scenarioDirs) {
      const scenarioPath = join(ADVERSARIAL_DIR, scenarioDir, 'scenario.json');
      let scenario: AdversarialScenario;

      try {
        const scenarioContent = readFileSync(scenarioPath, 'utf-8');
        scenario = JSON.parse(scenarioContent) as AdversarialScenario;
      } catch (error) {
        continue;
      }

      totalScenarios++;

      const result = validator.validate(
        scenario.draftText,
        scenario.factSetIds,
        scenario.metadata
      );

      if (result.status === 'retry' || result.status === 'fallback') {
        rejectedScenarios++;
      }
    }

    const rejectionRate = totalScenarios > 0 ? rejectedScenarios / totalScenarios : 0;
    expect(rejectionRate).toBe(1.0); // 100% rejection rate
    expect(totalScenarios).toBeGreaterThan(0); // Ensure scenarios exist
  });
});
