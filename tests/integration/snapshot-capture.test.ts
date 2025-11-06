import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { captureSnapshot } from '../../src/snapshot/capture.js';

const fixtureRoot = path.resolve('tests/fixtures/phase5/baseline/tiny-react');
const goldenPath = path.join(fixtureRoot, '.ceps', 'snapshot.json');

describe('snapshot capture integration', () => {
  it('matches golden snapshot for tiny-react fixture', async () => {
    const actual = await captureSnapshot({ root: fixtureRoot });
    const expected = JSON.parse(fs.readFileSync(goldenPath, 'utf8'));

    expect(actual.rootHash).toBe(expected.rootHash);
    expect(actual.files).toEqual(expected.files);
  });
});
