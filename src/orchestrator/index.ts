#!/usr/bin/env node
import { parseArgs, validateArgs, printHelp } from './cli.js';
import { Orchestrator, PipelinePhase } from './orchestrator.js';
import { KnowledgeBase } from '../kb/knowledge-base.js';
import { LLMGateway } from '../llm/gateway.js';
import { BudgetTracker } from '../llm/budget.js';
import { GroundingValidator } from '../validation/grounding-validator.js';
import { emitRunSummary } from './rendering/run-summary-renderer.js';

const VERSION = '0.2.0';

export async function run(argv: string[]): Promise<number> {
  try {
    const args = parseArgs(argv);

    // Handle --help flag (before validation)
    if (args.help) {
      printHelp(VERSION);
      return 0;
    }

    // Handle --version flag
    if (args.version) {
      console.log(`ceps v${VERSION}`);
      return 0;
    }

    validateArgs(args);

    // Phase 5: Handle finalize command
    if (args.command === 'finalize') {
      console.log(`ceps v${VERSION} - Finalization`);
      console.log(`Project root: ${args.projectRoot}`);
      console.log(`Answers: ${args.answersPath}`);
      if (args.dryRun) {
        console.log('Mode: Dry-run (preview only)\n');
      }

      // Setup LLM components if enabled
      let gateway, budgetTracker, validator;
      if (args.llm === 'on') {
        budgetTracker = new BudgetTracker(args.llmBudget || 1000000);
        const provider = (args.llmProvider === 'azure' || args.llmProvider === 'local')
          ? 'anthropic'
          : (args.llmProvider || 'anthropic');

        gateway = new LLMGateway({
          anthropicApiKey: process.env.ANTHROPIC_API_KEY,
          openaiApiKey: process.env.OPENAI_API_KEY,
          provider: provider as 'anthropic' | 'openai',
          budgetTokens: args.llmBudget,
          enableCache: !args.noLlmCache
        });
        validator = new GroundingValidator(new KnowledgeBase()); // Temporary KB for validator
      }

      // Run finalization
      const orchestrator = new Orchestrator({ projectRoot: args.projectRoot });
      const result = await orchestrator.runFinalize({
        answersPath: args.answersPath!,
        dryRun: args.dryRun || false,
        reconcile: args.reconcile || false,
        deterministicMode: args.deterministic || false,
        scope: args.finalizeScope || 'auto',
        maxHops: args.finalizeMaxHops || 3,
        maxNodes: args.finalizeMaxNodes || 250,
        llmEnabled: args.llm === 'on',
        llmGateway: gateway,
        validator: validator,
        budgetTracker: budgetTracker
      });

      // Print summary
      console.log('\n' + '='.repeat(60));
      console.log('Finalization Summary');
      console.log('='.repeat(60));
      console.log(`Status: ${result.summary.status}`);
      console.log(`Resolved QIDs: ${result.summary.resolvedQids}`);
      console.log(`Patched Files: ${result.summary.patchedFiles}`);
      console.log(`Updated Entities: ${result.summary.updatedEntities}`);
      if (result.summary.failedEntities > 0) {
        console.log(`Failed Entities: ${result.summary.failedEntities}`);
      }
      console.log(`Runtime: ${Math.round(result.summary.metrics.runtimeMs)}ms`);
      console.log('='.repeat(60));

      return result.exitCode;
    }

    // Baseline command continues below
    console.log(`ceps v${VERSION} (Phase 6)`);
    console.log(`Project root: ${args.projectRoot}`);

    const kb = new KnowledgeBase();
    let gateway: LLMGateway | undefined;
    let budgetTracker: BudgetTracker | undefined;
    let validator: GroundingValidator | undefined;

    if (args.llm === 'on') {
      budgetTracker = new BudgetTracker(args.llmBudget || 1000000);

      const provider = (args.llmProvider === 'azure' || args.llmProvider === 'local')
        ? 'anthropic'
        : (args.llmProvider || 'anthropic');

      gateway = new LLMGateway({
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        openaiApiKey: process.env.OPENAI_API_KEY,
        provider: provider as 'anthropic' | 'openai',
        budgetTokens: args.llmBudget,
        enableCache: !args.noLlmCache
      });

      validator = new GroundingValidator(kb);
    }

    const orchestrator = new Orchestrator({
      projectRoot: args.projectRoot,
      llm: args.llm,
      deterministic: args.deterministic,
      llmGateway: gateway,
      validator,
      budgetTracker,
      snapshotEnabled: !args.noSnapshot,
      knowledgeBase: kb
    });

    const phaseNames: Partial<Record<PipelinePhase, string>> = {
      [PipelinePhase.SCANNING]: 'Scanning files',
      [PipelinePhase.PARSING]: 'Parsing code',
      [PipelinePhase.RELATION_RESOLUTION]: 'Resolving relations',
      [PipelinePhase.GRAPH_BUILDING]: 'Building graphs',
      [PipelinePhase.REASONING]: 'Lifting behavior',
      [PipelinePhase.AMBIGUITY_RESOLUTION]: 'Resolving ambiguities',
      [PipelinePhase.VALIDATION_PRE]: 'Pre-generation validation',
      [PipelinePhase.GENERATION]: 'Generating specs',
      [PipelinePhase.VALIDATION_POST]: 'Post-generation validation'
    };

    orchestrator.on('phaseStart', (phase) => {
      const phaseKey = phase as PipelinePhase;
      const label = phaseNames[phaseKey] ?? phaseKey;
      console.log(`\n${label}...`);
    });

    orchestrator.on('phaseComplete', (phase) => {
      const phaseKey = phase as PipelinePhase;
      const label = phaseNames[phaseKey] ?? phaseKey;
      console.log(`  ✓ ${label} complete`);
    });

    await orchestrator.run();

    const runSummary = orchestrator.getRunSummary();
    if (!runSummary) {
      throw new Error('Run summary unavailable');
    }

    emitRunSummary(runSummary, { console: true });
    return runSummary.exitCode;
  } catch (error) {
    console.error('Error:', (error as Error).message);
    return 1; // failure
  }
}

// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  run(process.argv).then((code) => process.exit(code));
}
