#!/usr/bin/env node

import { captureSnapshot } from '../src/snapshot/capture.js';
import fs from 'fs';

const fixtureRoot = 'tests/fixtures/phase5/baseline/tiny-react';
const outputPath = `${fixtureRoot}/.ceps/snapshot.json`;

console.log('Capturing snapshot for:', fixtureRoot);

const result = await captureSnapshot({ root: fixtureRoot });

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2) + '\n', 'utf8');

console.log('✓ Snapshot regenerated');
console.log('  Files:', result.files.length);
console.log('  rootHash:', result.rootHash);
console.log('\nFiles in snapshot:');
result.files.forEach(f => console.log('  -', f.path));
