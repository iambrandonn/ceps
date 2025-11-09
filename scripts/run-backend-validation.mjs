#!/usr/bin/env node

/**
 * Backend Validation Script for Phase 6
 *
 * Automates validation of ceps pattern detection on real-world backend projects.
 * Supports Express, Mongoose, and HTTP client patterns.
 *
 * Usage:
 *   # Run validation on projects
 *   node scripts/run-backend-validation.mjs /path/to/project1 /path/to/project2
 *
 *   # With config file
 *   node scripts/run-backend-validation.mjs --config validation-config.json
 *
 *   # Compute metrics from annotated results
 *   node scripts/run-backend-validation.mjs --compute-metrics results.json
 *
 * @see docs/planning/active/phase6/http-clients-plan.md §5
 */

import { spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG = {
  validationTargets: [],
  thresholds: {
    precision: 0.85,
    recall: 0.80,
    f1: 0.82,
  },
  frameworkName: 'Backend Patterns (Express + Mongoose + HTTP Clients)',
  behaviorCategories: [
    'Express Routes',
    'Express Middleware',
    'Express Error Handlers',
    'Mongoose Schemas',
    'Mongoose Models',
    'Mongoose Queries',
    'HTTP Client Instances',
    'HTTP Client Calls',
    'HTTP Error Handling',
  ],
};

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(argv) {
  const args = argv.slice(2);
  const result = {
    mode: 'validate', // 'validate' or 'compute-metrics'
    projectDirs: [],
    configPath: null,
    resultsPath: null,
    outputPath: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--config') {
      result.configPath = args[++i];
    } else if (arg === '--compute-metrics') {
      result.mode = 'compute-metrics';
      result.resultsPath = args[++i];
    } else if (arg === '--output' || arg === '-o') {
      result.outputPath = args[++i];
    } else if (!arg.startsWith('--')) {
      result.projectDirs.push(arg);
    }
  }

  return result;
}

// ============================================================================
// Config Loading
// ============================================================================

function loadConfig(configPath) {
  if (!configPath) {
    return DEFAULT_CONFIG;
  }

  const fullPath = resolve(configPath);
  if (!existsSync(fullPath)) {
    console.error(`Error: Config file not found: ${fullPath}`);
    process.exit(1);
  }

  try {
    const configJson = readFileSync(fullPath, 'utf-8');
    const config = JSON.parse(configJson);
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.error(`Error: Failed to parse config file: ${error.message}`);
    process.exit(1);
  }
}

// ============================================================================
// Run ceps on a project
// ============================================================================

async function runCeps(projectDir, mode) {
  return new Promise((resolve, reject) => {
    const args = [projectDir];

    if (mode === 'llm-off') {
      args.push('--llm', 'off', '--deterministic');
    } else if (mode === 'llm-on') {
      args.push('--llm', 'on');
    }

    const startTime = Date.now();
    const startMem = process.memoryUsage().rss;

    const child = spawn('node', [join(projectRoot, 'dist/cli.js'), ...args], {
      cwd: projectRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let peakRSS = startMem;

    // Monitor memory usage
    const memInterval = setInterval(() => {
      const currentRSS = process.memoryUsage().rss;
      if (currentRSS > peakRSS) {
        peakRSS = currentRSS;
      }
    }, 100);

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      clearInterval(memInterval);
      const endTime = Date.now();
      const runtime = (endTime - startTime) / 1000; // seconds
      const peakRSSMB = Math.round(peakRSS / 1024 / 1024);

      // Parse gate status from stderr
      const gates = parseGateStatus(stderr);

      // Find generated spec.md files
      const specFiles = findSpecFiles(projectDir);

      resolve({
        mode,
        exitCode,
        gates,
        runtime,
        peakRSS: peakRSSMB,
        specFiles,
        stdout,
        stderr,
      });
    });

    child.on('error', (error) => {
      clearInterval(memInterval);
      reject(error);
    });
  });
}

// ============================================================================
// Parse gate status from ceps output
// ============================================================================

function parseGateStatus(stderr) {
  const gates = {
    coverage: 'UNKNOWN',
    link: 'UNKNOWN',
    grounding: 'UNKNOWN',
    confidence: 'UNKNOWN',
  };

  const lines = stderr.split('\n');
  for (const line of lines) {
    if (line.includes('[PASS ]') || line.includes('[FAIL ]') || line.includes('[SKIP ]')) {
      const match = line.match(/\[(\w+)\s*\]\s+(\w+)/);
      if (match) {
        const status = match[1]; // PASS, FAIL, SKIP
        const gateName = match[2].toLowerCase(); // coverage, link, etc.

        if (gateName in gates) {
          gates[gateName] = status;
        }
      }
    }
  }

  return gates;
}

// ============================================================================
// Find generated spec.md files
// ============================================================================

function findSpecFiles(projectDir) {
  const specFiles = [];

  function walk(dir) {
    try {
      const entries = require('fs').readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);

        // Skip node_modules, .git, etc.
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(fullPath);
        } else if (entry.isFile() && entry.name === 'spec.md') {
          specFiles.push(fullPath);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }

  walk(projectDir);
  return specFiles;
}

// ============================================================================
// Validate a single project
// ============================================================================

async function validateProject(projectDir) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Validating: ${projectDir}`);
  console.log('='.repeat(80));

  // Check if project exists
  if (!existsSync(projectDir)) {
    console.error(`Error: Project directory not found: ${projectDir}`);
    return null;
  }

  const results = {
    project: projectDir,
    runs: [],
    behaviors: [],
  };

  // Run with --llm off
  console.log('\n[1/2] Running ceps with --llm off --deterministic...');
  try {
    const llmOffResult = await runCeps(projectDir, 'llm-off');
    results.runs.push(llmOffResult);
    console.log(`  Exit Code: ${llmOffResult.exitCode}`);
    console.log(`  Gates: ${JSON.stringify(llmOffResult.gates)}`);
    console.log(`  Runtime: ${llmOffResult.runtime.toFixed(2)}s`);
    console.log(`  Peak RSS: ${llmOffResult.peakRSS}MB`);
    console.log(`  Spec Files: ${llmOffResult.specFiles.length}`);
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    results.runs.push({
      mode: 'llm-off',
      exitCode: -1,
      error: error.message,
    });
  }

  // Run with --llm on
  console.log('\n[2/2] Running ceps with --llm on...');
  try {
    const llmOnResult = await runCeps(projectDir, 'llm-on');
    results.runs.push(llmOnResult);
    console.log(`  Exit Code: ${llmOnResult.exitCode}`);
    console.log(`  Gates: ${JSON.stringify(llmOnResult.gates)}`);
    console.log(`  Runtime: ${llmOnResult.runtime.toFixed(2)}s`);
    console.log(`  Peak RSS: ${llmOnResult.peakRSS}MB`);
    console.log(`  Spec Files: ${llmOnResult.specFiles.length}`);
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    results.runs.push({
      mode: 'llm-on',
      exitCode: -1,
      error: error.message,
    });
  }

  // Generate behavior stubs for manual annotation
  console.log('\n[3/3] Generating behavior annotation stubs...');
  results.behaviors = generateBehaviorStubs(projectDir, results.runs);
  console.log(`  Generated ${results.behaviors.length} behavior stubs for annotation`);

  return results;
}

// ============================================================================
// Generate behavior stubs for manual annotation
// ============================================================================

function generateBehaviorStubs(projectDir, runs) {
  const behaviors = [];

  // Find spec files from successful runs
  const specFiles = runs
    .filter(r => r.specFiles && r.specFiles.length > 0)
    .flatMap(r => r.specFiles);

  // For each spec file, create annotation stubs
  const uniqueSpecFiles = [...new Set(specFiles)];

  for (const specFile of uniqueSpecFiles) {
    behaviors.push({
      id: `behavior-${behaviors.length + 1}`,
      file: specFile,
      detected: null, // To be filled by human annotator
      accurate: null, // To be filled by human annotator (true/false/partial)
      category: null, // e.g., "Express Routes", "Mongoose Models", "HTTP Calls"
      notes: '', // Human annotator notes
    });
  }

  return behaviors;
}

// ============================================================================
// Compute Metrics from Annotated Results
// ============================================================================

function computeMetrics(resultsPath) {
  console.log(`\nComputing metrics from: ${resultsPath}`);
  console.log('='.repeat(80));

  if (!existsSync(resultsPath)) {
    console.error(`Error: Results file not found: ${resultsPath}`);
    process.exit(1);
  }

  const results = JSON.parse(readFileSync(resultsPath, 'utf-8'));

  // Aggregate across all projects
  let truePositives = 0;
  let falsePositives = 0;
  let falseNegatives = 0;

  for (const behavior of results.behaviors || []) {
    if (behavior.detected === true && behavior.accurate === true) {
      truePositives++;
    } else if (behavior.detected === true && behavior.accurate === false) {
      falsePositives++;
    } else if (behavior.detected === false) {
      falseNegatives++;
    }
    // Partial accuracy counts as 0.5 TP, 0.5 FP
    else if (behavior.detected === true && behavior.accurate === 'partial') {
      truePositives += 0.5;
      falsePositives += 0.5;
    }
  }

  const precision = truePositives / (truePositives + falsePositives) || 0;
  const recall = truePositives / (truePositives + falseNegatives) || 0;
  const f1 = (2 * precision * recall) / (precision + recall) || 0;

  console.log('\nAccuracy Metrics:');
  console.log('-'.repeat(80));
  console.log(`  True Positives:  ${truePositives}`);
  console.log(`  False Positives: ${falsePositives}`);
  console.log(`  False Negatives: ${falseNegatives}`);
  console.log(`  Precision:       ${(precision * 100).toFixed(2)}%`);
  console.log(`  Recall:          ${(recall * 100).toFixed(2)}%`);
  console.log(`  F1 Score:        ${(f1 * 100).toFixed(2)}%`);

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    f1,
  };
}

// ============================================================================
// Generate Validation Report
// ============================================================================

function generateReport(config, allResults, metrics) {
  const timestamp = new Date().toISOString().split('T')[0];

  let report = `# Backend Validation Report\n\n`;
  report += `**Framework:** ${config.frameworkName}\n`;
  report += `**Date:** ${timestamp}\n`;
  report += `**Projects Validated:** ${allResults.length}\n\n`;
  report += `---\n\n`;

  report += `## Executive Summary\n\n`;

  if (metrics) {
    const { precision, recall, f1 } = metrics;
    const thresholds = config.thresholds;

    const passedPrecision = precision >= thresholds.precision;
    const passedRecall = recall >= thresholds.recall;
    const passedF1 = f1 >= thresholds.f1;

    const goNoGo = passedPrecision && passedRecall && passedF1 ? '✅ GO' : '❌ NO-GO';

    report += `**Recommendation:** ${goNoGo}\n\n`;
    report += `| Metric | Score | Threshold | Status |\n`;
    report += `|--------|-------|-----------|--------|\n`;
    report += `| Precision | ${(precision * 100).toFixed(2)}% | ${(thresholds.precision * 100).toFixed(0)}% | ${passedPrecision ? '✅ PASS' : '❌ FAIL'} |\n`;
    report += `| Recall | ${(recall * 100).toFixed(2)}% | ${(thresholds.recall * 100).toFixed(0)}% | ${passedRecall ? '✅ PASS' : '❌ FAIL'} |\n`;
    report += `| F1 Score | ${(f1 * 100).toFixed(2)}% | ${(thresholds.f1 * 100).toFixed(0)}% | ${passedF1 ? '✅ PASS' : '❌ FAIL'} |\n\n`;
  } else {
    report += `**Status:** Validation runs completed, awaiting manual annotation\n\n`;
  }

  report += `---\n\n`;
  report += `## Per-Project Results\n\n`;

  for (const result of allResults) {
    report += `### ${result.project}\n\n`;

    for (const run of result.runs) {
      report += `**Mode:** ${run.mode}\n\n`;
      report += `- Exit Code: ${run.exitCode}\n`;
      report += `- Runtime: ${run.runtime?.toFixed(2)}s\n`;
      report += `- Peak RSS: ${run.peakRSS}MB\n`;
      report += `- Gates:\n`;
      if (run.gates) {
        for (const [gate, status] of Object.entries(run.gates)) {
          report += `  - ${gate}: ${status}\n`;
        }
      }
      report += `- Spec Files Generated: ${run.specFiles?.length || 0}\n\n`;
    }
  }

  report += `---\n\n`;
  report += `## Behavior Categories\n\n`;
  report += `The following behavior categories are tracked:\n\n`;
  for (const category of config.behaviorCategories) {
    report += `- ${category}\n`;
  }
  report += `\n`;

  report += `---\n\n`;
  report += `## Next Steps\n\n`;

  if (!metrics) {
    report += `1. **Manual Annotation:** Review generated spec.md files and annotate behaviors in JSON\n`;
    report += `2. **Compute Metrics:** Run \`node scripts/run-backend-validation.mjs --compute-metrics results.json\`\n`;
    report += `3. **Generate Final Report:** Review metrics and make go/no-go decision\n`;
  } else {
    const { precision, recall, f1 } = metrics;
    const thresholds = config.thresholds;

    if (precision >= thresholds.precision && recall >= thresholds.recall && f1 >= thresholds.f1) {
      report += `✅ **VALIDATION PASSED** - Proceed with Wave 1B (React/Redux/GraphQL)\n`;
    } else {
      report += `❌ **VALIDATION FAILED** - Address issues and re-validate before Wave 1B\n\n`;
      report += `**Required Actions:**\n`;
      if (precision < thresholds.precision) {
        report += `- Improve precision (reduce false positives)\n`;
      }
      if (recall < thresholds.recall) {
        report += `- Improve recall (reduce false negatives)\n`;
      }
    }
  }

  return report;
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const args = parseArgs(process.argv);

  if (args.mode === 'compute-metrics') {
    // Compute metrics mode
    const metrics = computeMetrics(args.resultsPath);
    const config = DEFAULT_CONFIG; // Could load from config if needed

    const report = generateReport(config, [], metrics);

    const outputPath = args.outputPath || 'validation-report.md';
    writeFileSync(outputPath, report);
    console.log(`\n✅ Report generated: ${outputPath}`);

  } else {
    // Validation mode
    const config = loadConfig(args.configPath);

    // Determine project directories
    const projectDirs = args.projectDirs.length > 0
      ? args.projectDirs
      : config.validationTargets;

    if (projectDirs.length === 0) {
      console.error('Error: No project directories specified');
      console.error('Usage: node scripts/run-backend-validation.mjs <dir1> <dir2> ...');
      console.error('   or: node scripts/run-backend-validation.mjs --config validation-config.json');
      process.exit(1);
    }

    // Validate each project
    const allResults = [];
    for (const projectDir of projectDirs) {
      const result = await validateProject(projectDir);
      if (result) {
        allResults.push(result);
      }
    }

    // Save results JSON
    const outputPath = args.outputPath || 'validation-results.json';
    writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
    console.log(`\n✅ Results saved to: ${outputPath}`);

    // Generate initial report (without metrics)
    const report = generateReport(config, allResults, null);
    const reportPath = outputPath.replace('.json', '-report.md');
    writeFileSync(reportPath, report);
    console.log(`✅ Report saved to: ${reportPath}`);

    console.log(`\n${'='.repeat(80)}`);
    console.log('Next Steps:');
    console.log('1. Review generated spec.md files in project directories');
    console.log(`2. Annotate behaviors in ${outputPath}`);
    console.log(`3. Run: node scripts/run-backend-validation.mjs --compute-metrics ${outputPath}`);
    console.log('='.repeat(80));
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
