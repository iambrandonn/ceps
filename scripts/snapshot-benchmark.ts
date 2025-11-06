#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import path from 'node:path';
import process from 'node:process';
import { captureSnapshot } from '../src/snapshot/capture.js';

interface BenchmarkOptions {
  root: string;
  iterations: number;
}

function parseArgs(): BenchmarkOptions {
  const [, , maybeRoot, maybeIterations] = process.argv;
  const root = maybeRoot ? path.resolve(maybeRoot) : process.cwd();
  const iterations = maybeIterations ? Math.max(1, Number(maybeIterations)) : 1;
  return { root, iterations: Number.isFinite(iterations) ? iterations : 1 };
}

async function main() {
  const { root, iterations } = parseArgs();
  console.log(`Running snapshot benchmark on ${root} (${iterations} iteration${iterations === 1 ? '' : 's'})`);

  const timings: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    const snapshot = await captureSnapshot({ root });
    const end = performance.now();
    timings.push(end - start);
    console.log(`  Iteration ${i + 1}: ${snapshot.files.length} files, ${(end - start).toFixed(2)}ms`);
  }

  const total = timings.reduce((sum, value) => sum + value, 0);
  const average = total / timings.length;
  console.log(`Average time: ${average.toFixed(2)}ms`);
}

main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exitCode = 1;
});
