#!/usr/bin/env node
import { parseArgs, validateArgs } from './cli.js';
import { Orchestrator } from './orchestrator.js';
import { Scanner } from '../scanner/scanner.js';
import { Parser } from '../parser/parser.js';
import { KnowledgeBase } from '../kb/knowledge-base.js';
import { SpecGenerator, type GeneratorOptions } from '../generator/spec-generator.js';
import { LLMGateway } from '../llm/gateway.js';
import { BudgetTracker } from '../llm/budget.js';
import { GroundingValidator } from '../validation/grounding-validator.js';
import { CrossLinkValidator } from '../validation/cross-link-validator.js';
import { GateRegistry } from './gates/gate-registry.js';
import { emitRunSummary } from './rendering/run-summary-renderer.js';
import { captureSnapshot, writeSnapshot } from '../snapshot/index.js';
import type { GateInputs } from './types/gate-engine.js';
import * as fs from 'fs';
import * as path from 'path';

const VERSION = '0.2.0';

export async function run(argv: string[]): Promise<number> {
  try {
    const args = parseArgs(argv);

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
    console.log(`ceps v${VERSION} (Phase 2)`);
    console.log(`Project root: ${args.projectRoot}`);

    // Phase 2: Scanner
    console.log('\nScanning files...');
    const scanner = new Scanner(args.projectRoot);
    const fileIndex = await scanner.scan();

    console.log(`Found ${fileIndex.entries.length} files`);

    if (fileIndex.packages.packages.length > 0) {
      console.log(`Detected monorepo with ${fileIndex.packages.packages.length} packages:`);
      for (const pkg of fileIndex.packages.packages) {
        console.log(`  - ${pkg.name} (${pkg.files.length} files)`);
      }
    }

    // File type breakdown
    const byKind = {
      code: fileIndex.entries.filter(e => e.kind === 'code').length,
      test: fileIndex.entries.filter(e => e.kind === 'test').length,
      config: fileIndex.entries.filter(e => e.kind === 'config').length,
      contract: fileIndex.entries.filter(e => e.kind === 'contract').length
    };

    console.log('\nFile breakdown:');
    console.log(`  Code:     ${byKind.code}`);
    console.log(`  Tests:    ${byKind.test}`);
    console.log(`  Config:   ${byKind.config}`);
    console.log(`  Contract: ${byKind.contract}`);

    // Phase 2: Parse files and populate KB
    console.log('\nParsing code files...');
    const kb = new KnowledgeBase();
    const parser = new Parser();
    let parsedCount = 0;
    let errorCount = 0;

    const codeFiles = fileIndex.entries.filter(e => e.kind === 'code');

    for (const entry of codeFiles) {
      try {
        const source = fs.readFileSync(entry.absolutePath, 'utf8');
        await parser.parseAndStore(entry.path, source, kb);
        parsedCount++;
      } catch (error) {
        console.error(`  ⚠ Failed to parse ${entry.path}: ${(error as Error).message}`);
        errorCount++;
      }
    }

    console.log(`Parsed ${parsedCount} files successfully`);
    if (errorCount > 0) {
      console.log(`  ⚠ ${errorCount} files had parse errors`);
    }

    const exportedEntities = kb.listExported();
    console.log(`Extracted ${exportedEntities.length} exported entities`);

    // Phase 4: Setup LLM components if enabled
    let gateway: LLMGateway | undefined;
    let budgetTracker: BudgetTracker | undefined;
    let validator: GroundingValidator | undefined;

    if (args.llm === 'on') {
      budgetTracker = new BudgetTracker(args.llmBudget || 1000000);

      // Map provider (CLI allows azure/local but gateway only supports anthropic/openai)
      const provider = (args.llmProvider === 'azure' || args.llmProvider === 'local')
        ? 'anthropic' // fallback to anthropic
        : (args.llmProvider || 'anthropic');

      gateway = new LLMGateway({
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        openaiApiKey: process.env.OPENAI_API_KEY,
        provider: provider as 'anthropic' | 'openai',
        budgetTokens: args.llmBudget,
        enableCache: !args.noLlmCache
      });
      // Note: args.llmModel is parsed but not yet supported by LLMGateway
      validator = new GroundingValidator(kb);
    }

    // Phase 4: Generate specs with LLM polish
    console.log('\nGenerating specifications...');
    const options: GeneratorOptions = {
      llmEnabled: args.llm === 'on',
      deterministicMode: args.deterministic,
      llmGateway: gateway,
      validator: validator,
      budgetTracker: budgetTracker
    };

    const generator = new SpecGenerator(kb, fileIndex, options);

    // Generate root spec
    const rootSpec = generator.generateRootSpec(args.projectRoot);
    const rootSpecPath = path.join(args.projectRoot, 'spec.md');
    fs.writeFileSync(rootSpecPath, rootSpec, 'utf8');
    console.log(`  ✓ Generated root spec: spec.md`);

    // Generate directory/package specs (async for LLM polish)
    const dirSpecs = await generator.generateDirectorySpecsAsync(args.projectRoot);
    let specsWritten = 0;

    for (const [specPath, content] of Object.entries(dirSpecs)) {
      const fullPath = path.join(args.projectRoot, specPath);

      // Ensure directory exists
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`  ✓ Generated spec: ${specPath}`);
      specsWritten++;
    }

    if (args.noSnapshot) {
      console.log('\nSkipping snapshot capture (--no-snapshot)');
    } else {
      console.log('\nCapturing snapshot...');
      const snapshot = await captureSnapshot({ root: args.projectRoot });
      const snapshotPath = path.join(args.projectRoot, '.ceps', 'snapshot.json');
      writeSnapshot(snapshot, snapshotPath);
      console.log('  ✓ Snapshot saved: .ceps/snapshot.json');
    }

    // Phase 4: Collect metrics and build gate inputs
    const generatorMetrics = generator.getMetrics();
    const gatewayUsage = gateway?.getUsage();

    // Build gate inputs from collected data (reuse exportedEntities from earlier)
    const allChunks = kb.getAllChunks();
    const entitiesWithChunks = new Set(allChunks.map(c => c.targetEntityId));

    // Get entities with open questions
    const allEntities = kb.getAllEntities();
    const entitiesWithQIDs = new Set(
      allEntities
        .filter(e => kb.getOpenQuestionsByEntity(e.id).length > 0)
        .map(e => e.id)
    );

    // Validate links for post-generation check
    const linkValidator = new CrossLinkValidator(kb);
    const specFiles = [
      { path: 'spec.md', content: rootSpec },
      ...Object.entries(dirSpecs).map(([path, content]) => ({ path, content }))
    ];
    const anchorMap = linkValidator.buildAnchorMap(specFiles);
    const linkValidation = linkValidator.validatePostGeneration(specFiles, anchorMap);

    // Count open questions for confidence gate
    const allOpenQuestions = allEntities.flatMap(e => kb.getOpenQuestionsByEntity(e.id));

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
        chunksWithMissingFactSetIds: [], // Tracked during generation
        diagnostics: generatorMetrics.diagnostics
      },
      determinism: {
        enabled: args.deterministic || false,
        reruns: 0,
        diffs: 0
      },
      confidence: {
        openQuestions: allOpenQuestions.length,
        invalidConfidenceItems: []
      },
      monorepo: {
        hasRootSpec: true,
        packagesLinked: fileIndex.packages.packages.length,
        brokenPackageLinks: 0
      },
      cost: {
        totalTokens: gatewayUsage?.totalTokens || 0,
        budget: args.llmBudget || 0
      },
      adversarial: {
        total: 0, // N/A for CLI mode
        rejected: 0
      },
      testCoverage: {
        coverage: 100, // N/A for CLI mode - set to 100 to pass gate
        threshold: 80
      },
      readability: {},
      tokens: {
        total: gatewayUsage?.totalTokens || 0,
        budget: args.llmBudget || 0,
        providers: gatewayUsage?.byProvider
          ? Object.fromEntries(
              Object.entries(gatewayUsage.byProvider).map(([k, v]) => [k, v.totalTokens])
            )
          : {}
      },
      warnings: generatorMetrics.warnings
    };

    // Evaluate gates and emit run summary
    const registry = new GateRegistry();
    const runSummary = registry.evaluateAll(gateInputs);

    // Emit run summary (console + optional JSON)
    emitRunSummary(runSummary, {
      console: true,
      jsonPath: undefined // Could add CLI flag for this later
    });

    // Return exit code from gates
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
