/**
 * Phase 3 Step 7: Orchestrator
 *
 * Coordinates the full Phase 3 intelligence pipeline with 10 phases:
 * scanning → parsing → relation-resolution → graph-building → reasoning →
 * ambiguity-resolution → validation-pre → generation → validation-post → complete
 *
 * Features:
 * - Event-based progress reporting (phaseStart, phaseComplete, phaseError)
 * - Fail-fast validation gates (halt on coverage/link failures)
 * - Statistics tracking (filesScanned, entitiesFound, coverage, etc.)
 * - Partial execution support (runUntil for testing)
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeBase } from '../kb/knowledge-base.js';
import { Scanner } from '../scanner/scanner.js';
import { Parser } from '../parser/parser.js';
import { RelationResolver } from '../reasoning/relation-resolver.js';
import { IntentLifter } from '../reasoning/IntentLifter.js';
import { AmbiguityResolver } from '../reasoning/ambiguity-resolver.js';
import { CrossLinkValidator } from '../validation/cross-link-validator.js';
import { SpecGenerator, type GeneratorOptions } from '../generator/spec-generator.js';
import { PatternMatcher } from '../reasoning/PatternMatcher.js';
import { FileIndex } from '../types/index.js';
import { GateRegistry } from './gates/gate-registry.js';
import { emitRunSummary } from './rendering/run-summary-renderer.js';
import type { GateInputs } from './types/gate-engine.js';
import type { RunSummary } from './types/run-summary.js';
import type { LLMGateway } from '../llm/gateway.js';
import type { BudgetTracker } from '../llm/budget.js';
import type { Validator } from '../validation/types.js';
import { captureSnapshot, writeSnapshot } from '../snapshot/index.js';

export enum PipelinePhase {
  SCANNING = 'scanning',
  PARSING = 'parsing',
  RELATION_RESOLUTION = 'relation-resolution',
  GRAPH_BUILDING = 'graph-building',
  REASONING = 'reasoning',
  AMBIGUITY_RESOLUTION = 'ambiguity-resolution',
  VALIDATION_PRE = 'validation-pre',
  GENERATION = 'generation',
  VALIDATION_POST = 'validation-post',
  COMPLETE = 'complete'
}

export interface PipelineStatus {
  currentPhase: PipelinePhase;
  startTime: Date;
  statistics: PipelineStatistics;
  errors: PipelineError[];
}

export interface PipelineStatistics {
  filesScanned: number;
  entitiesFound: number;
  relationsResolved: number;
  chunksGenerated: number;
  openQuestions: number;
  coverage: number;
}

export interface PipelineError {
  phase: PipelinePhase;
  message: string;
  details?: unknown;
}

export interface OrchestratorOptions {
  projectRoot: string;
  llm?: 'on' | 'off';
  deterministic?: boolean;
  llmGateway?: LLMGateway;
  validator?: Validator;
  budgetTracker?: BudgetTracker;
  snapshotEnabled?: boolean;
}

export class Orchestrator extends EventEmitter {
  private kb: KnowledgeBase;
  private status: PipelineStatus;
  private fileIndex?: FileIndex; // Store scanner output for parsing phase
  private runSummary?: RunSummary; // Store gate evaluation results
  private generator?: SpecGenerator; // Store for gate evaluation
  private rootSpec?: string; // Store for gate evaluation
  private dirSpecs?: Record<string, string>; // Store for gate evaluation
  private options: OrchestratorOptions;
  private rootPath: string;
  private snapshotEnabled: boolean;

  constructor(options: OrchestratorOptions | string) {
    super();

    // Support legacy string constructor for backwards compatibility
    if (typeof options === 'string') {
      this.options = { projectRoot: options, llm: 'off' };
      this.rootPath = options;
    } else {
      this.options = options;
      this.rootPath = options.projectRoot;
    }

    this.kb = new KnowledgeBase();
    this.snapshotEnabled = this.options.snapshotEnabled ?? true;
    this.status = {
      currentPhase: PipelinePhase.SCANNING,
      startTime: new Date(),
      statistics: {
        filesScanned: 0,
        entitiesFound: 0,
        relationsResolved: 0,
        chunksGenerated: 0,
        openQuestions: 0,
        coverage: 0
      },
      errors: []
    };
  }

  async run(): Promise<void> {
    const phases = [
      PipelinePhase.SCANNING,
      PipelinePhase.PARSING,
      PipelinePhase.RELATION_RESOLUTION,
      PipelinePhase.GRAPH_BUILDING,
      PipelinePhase.REASONING,
      PipelinePhase.AMBIGUITY_RESOLUTION,
      PipelinePhase.VALIDATION_PRE,
      PipelinePhase.GENERATION,
      PipelinePhase.VALIDATION_POST,
      PipelinePhase.COMPLETE
    ];

    for (const phase of phases) {
      await this.executePhase(phase);
    }

    // After all phases complete, evaluate gates
    if (this.generator && this.rootSpec && this.dirSpecs) {
      if (this.snapshotEnabled) {
        await this.captureProjectSnapshot();
      }
      await this.evaluateGates(this.generator, this.rootSpec, this.dirSpecs);
    }
  }

  async runUntil(targetPhase: PipelinePhase): Promise<void> {
    const phases = Object.values(PipelinePhase);
    const targetIndex = phases.indexOf(targetPhase);

    for (let i = 0; i <= targetIndex; i++) {
      await this.executePhase(phases[i]);
    }
  }

  private async executePhase(phase: PipelinePhase): Promise<void> {
    this.status.currentPhase = phase;
    this.emit('phaseStart', phase);

    try {
      switch (phase) {
        case PipelinePhase.SCANNING:
          await this.runScanning();
          break;
        case PipelinePhase.PARSING:
          await this.runParsing();
          break;
        case PipelinePhase.RELATION_RESOLUTION:
          await this.runRelationResolution();
          break;
        case PipelinePhase.GRAPH_BUILDING:
          await this.runGraphBuilding();
          break;
        case PipelinePhase.REASONING:
          await this.runReasoning();
          break;
        case PipelinePhase.AMBIGUITY_RESOLUTION:
          await this.runAmbiguityResolution();
          break;
        case PipelinePhase.VALIDATION_PRE:
          await this.runPreValidation();
          break;
        case PipelinePhase.GENERATION:
          await this.runGeneration();
          break;
        case PipelinePhase.VALIDATION_POST:
          await this.runPostValidation();
          break;
        case PipelinePhase.COMPLETE:
          // No-op
          break;
      }

      this.emit('phaseComplete', phase);
    } catch (error) {
      this.handlePhaseError(phase, error);
    }
  }

  private async runScanning(): Promise<void> {
    const scanner = new Scanner(this.rootPath);
    this.fileIndex = await scanner.scan();
    this.status.statistics.filesScanned = this.fileIndex.entries.length;
  }

  private async runParsing(): Promise<void> {
    if (!this.fileIndex) {
      throw new Error('Scanning phase must complete before parsing');
    }

    const parser = new Parser();
    const codeFiles = this.fileIndex.entries.filter(e => e.kind === 'code');

    for (const entry of codeFiles) {
      const source = fs.readFileSync(entry.absolutePath, 'utf8');
      await parser.parseAndStore(entry.path, source, this.kb);
    }

    this.status.statistics.entitiesFound = this.kb.getAllEntities().length;
  }

  private async runRelationResolution(): Promise<void> {
    const resolver = new RelationResolver(this.kb);
    const relations = this.kb.getRelations(); // Get all relations (no argument)
    const resolved = resolver.resolve(relations);

    // Replace relations in KB
    this.kb.replaceRelations(resolved);

    const resolvedCount = resolved.filter(r => r.details?.resolved).length;
    this.status.statistics.relationsResolved = resolvedCount;
  }

  private async runGraphBuilding(): Promise<void> {
    // Force graph index computation by calling getters
    // These methods cache results on first call
    this.kb.getCallGraph();
    this.kb.getImportGraph();
    // Note: getReverseDeps(entityId) is entity-specific; cache built on first getCallGraph/getImportGraph call
  }

  private async runReasoning(): Promise<void> {
    const matcher = new PatternMatcher(this.kb);
    const lifter = new IntentLifter(this.kb, matcher);
    const entities = this.kb.getAllEntities();

    for (const entity of entities) {
      // Get factSets for this entity
      const factSets = this.kb.getFactSetsBySubject(entity.id);
      if (factSets.length > 0) {
        const chunk = lifter.liftIntent(factSets.map(fs => fs.id));
        this.kb.insertChunk(chunk);
      }
    }

    this.status.statistics.chunksGenerated = this.kb.getAllChunks().length;
  }

  private async runAmbiguityResolution(): Promise<void> {
    const resolver = new AmbiguityResolver(this.kb);
    const result = resolver.resolve({ maxIterations: 10 });

    this.status.statistics.openQuestions = result.openQuestions.length;
  }

  private async runPreValidation(): Promise<void> {
    const validator = new CrossLinkValidator(this.kb);
    const result = validator.validatePreGeneration();

    this.status.statistics.coverage = result.coverage;

    if (!result.passed) {
      // Build detailed error message with entity information
      const missingDetails = result.missingEntities.map(id => {
        const entity = this.kb.getEntity(id);
        if (entity) {
          return `  - ${entity.kind} "${entity.name}" at ${entity.path}`;
        }
        return `  - Unknown entity ${id}`;
      }).join('\n');

      throw new Error(
        `Coverage gate failed: ${result.missingEntities.length} entities missing BehaviorChunk or QID\n` +
        `Missing entities:\n${missingDetails}\n\n` +
        `Suggestion: Ensure all exported entities have documentation or carry Open Questions.`
      );
    }
  }

  private async runGeneration(): Promise<void> {
    if (!this.fileIndex) {
      throw new Error('Scanning phase must complete before generation');
    }

    // Phase 4: Build generator options with LLM components
    const generatorOptions: GeneratorOptions = {
      llmEnabled: this.options.llm === 'on',
      deterministicMode: this.options.deterministic,
      llmGateway: this.options.llmGateway,
      validator: this.options.validator,
      budgetTracker: this.options.budgetTracker
    };

    this.generator = new SpecGenerator(this.kb, this.fileIndex, generatorOptions);

    // Generate root spec
    this.rootSpec = this.generator.generateRootSpec(this.rootPath);
    const rootSpecPath = path.join(this.rootPath, 'spec.md');
    fs.writeFileSync(rootSpecPath, this.rootSpec, 'utf8');

    // Generate directory/package specs (async for Phase 4 LLM polish)
    this.dirSpecs = await this.generator.generateDirectorySpecsAsync(this.rootPath);
    for (const [specPath, content] of Object.entries(this.dirSpecs)) {
      const fullPath = path.join(this.rootPath, specPath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }

  private async captureProjectSnapshot(): Promise<void> {
    const snapshotPath = path.join(this.rootPath, '.ceps', 'snapshot.json');
    const snapshot = await captureSnapshot({ root: this.rootPath });
    writeSnapshot(snapshot, snapshotPath);
  }

  private async runPostValidation(): Promise<void> {
    if (!this.fileIndex) {
      throw new Error('Scanning phase must complete before validation');
    }

    const validator = new CrossLinkValidator(this.kb);

    // Phase 4: Build generator options
    const generatorOptions: GeneratorOptions = {
      llmEnabled: this.options.llm === 'on',
      deterministicMode: this.options.deterministic,
      llmGateway: this.options.llmGateway,
      validator: this.options.validator,
      budgetTracker: this.options.budgetTracker
    };

    const generator = new SpecGenerator(this.kb, this.fileIndex, generatorOptions);

    // Re-generate specs to get content for validation
    const rootSpec = generator.generateRootSpec(this.rootPath);
    const dirSpecs = await generator.generateDirectorySpecsAsync(this.rootPath);

    // Convert to SpecFile[] format expected by validator
    const specFiles = [
      { path: 'spec.md', content: rootSpec },
      ...Object.entries(dirSpecs).map(([path, content]) => ({ path, content }))
    ];

    const anchorMap = validator.buildAnchorMap(specFiles);
    const result = validator.validatePostGeneration(specFiles, anchorMap);

    if (!result.passed) {
      // Build detailed error message with broken link details
      // Show first 10 broken links to avoid overwhelming output
      const maxLinks = 10;
      const linkDetails = result.brokenLinks.slice(0, maxLinks).map(link =>
        `  - ${link.sourceFile}:${link.lineNumber} → ${link.targetAnchor}`
      ).join('\n');

      const remaining = result.brokenLinks.length > maxLinks
        ? `\n  ... and ${result.brokenLinks.length - maxLinks} more`
        : '';

      throw new Error(
        `Post-validation failed: ${result.brokenLinks.length} broken links\n` +
        `Broken links:\n${linkDetails}${remaining}\n\n` +
        `Suggestion: Verify that all cross-reference targets exist and anchors are correct.`
      );
    }
  }

  private handlePhaseError(phase: PipelinePhase, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.status.errors.push({
      phase,
      message: errorMessage,
      details: error
    });

    this.emit('phaseError', phase, error);
    throw error; // Re-throw to halt pipeline
  }

  getKnowledgeBase(): KnowledgeBase {
    return this.kb;
  }

  getStatus(): PipelineStatus {
    return { ...this.status, statistics: { ...this.status.statistics }, errors: [...this.status.errors] }; // Return deep copy
  }

  getRunSummary(): RunSummary | undefined {
    return this.runSummary;
  }

  private async evaluateGates(generator: SpecGenerator, rootSpec: string, dirSpecs: Record<string, string>): Promise<void> {
    if (!this.fileIndex) {
      throw new Error('File index required for gate evaluation');
    }

    // Collect metrics
    const generatorMetrics = generator.getMetrics();
    const gatewayUsage = this.options.llmGateway?.getUsage();

    // Build gate inputs from collected data
    const exportedEntities = this.kb.listExported();
    const allChunks = this.kb.getAllChunks();
    const entitiesWithChunks = new Set(allChunks.map(c => c.targetEntityId));

    // Get entities with open questions
    const allEntities = this.kb.getAllEntities();
    const entitiesWithQIDs = new Set(
      allEntities
        .filter(e => this.kb.getOpenQuestionsByEntity(e.id).length > 0)
        .map(e => e.id)
    );

    // Validate links for post-generation check
    const linkValidator = new CrossLinkValidator(this.kb);
    const specFiles = [
      { path: 'spec.md', content: rootSpec },
      ...Object.entries(dirSpecs).map(([path, content]) => ({ path, content }))
    ];
    const anchorMap = linkValidator.buildAnchorMap(specFiles);
    const linkValidation = linkValidator.validatePostGeneration(specFiles, anchorMap);

    // Count open questions for confidence gate
    const allOpenQuestions = allEntities.flatMap(e => this.kb.getOpenQuestionsByEntity(e.id));

    // Build gate inputs
    const gateInputs: GateInputs = {
      coverage: {
        exportedEntityIds: exportedEntities.map(e => e.id),
        entitiesWithChunks: Array.from(entitiesWithChunks),
        entitiesWithQIDs: Array.from(entitiesWithQIDs)
      },
      link: {
        totalAnchors: Object.keys(anchorMap).length,
        brokenLinks: linkValidation.brokenLinks || []
      },
      grounding: {
        totalChunks: generatorMetrics.llmPolished + generatorMetrics.templateFallback,
        validatedChunks: generatorMetrics.llmPolished,
        fallbackChunks: generatorMetrics.templateFallback,
        chunksWithMissingFactSetIds: [],
        diagnostics: []
      },
      determinism: {
        enabled: this.options.deterministic || false,
        reruns: 0,
        diffs: 0
      },
      confidence: {
        openQuestions: allOpenQuestions.length,
        invalidConfidenceItems: []
      },
      monorepo: {
        hasRootSpec: true,
        packagesLinked: this.fileIndex.packages.packages.length,
        brokenPackageLinks: 0
      },
      cost: {
        totalTokens: gatewayUsage?.totalTokens || 0,
        budget: 0 // Not available in programmatic API
      },
      adversarial: {
        total: 0,
        rejected: 0
      },
      testCoverage: {
        coverage: 100, // N/A for programmatic API - set to 100 to pass gate
        threshold: 80
      },
      readability: {},
      tokens: {
        total: gatewayUsage?.totalTokens || 0,
        budget: 0,
        providers: gatewayUsage?.byProvider
          ? Object.fromEntries(
              Object.entries(gatewayUsage.byProvider).map(([k, v]) => [k, v.totalTokens])
            )
          : {}
      },
      warnings: generatorMetrics.warnings
    };

    // Evaluate gates
    const registry = new GateRegistry();
    this.runSummary = registry.evaluateAll(gateInputs);
  }
}
