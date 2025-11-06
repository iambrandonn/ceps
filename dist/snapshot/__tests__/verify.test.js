import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { captureSnapshot, writeSnapshot } from '../capture.js';
import { verifySnapshot } from '../verify.js';
let tempDir;
let snapshotPath;
async function createSnapshotFixture() {
    const snapshot = await captureSnapshot({ root: tempDir });
    writeSnapshot(snapshot, snapshotPath);
}
function writeFile(relPath, content) {
    const fullPath = path.join(tempDir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf8');
}
describe('verifySnapshot', () => {
    beforeEach(async () => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-verify-'));
        snapshotPath = path.join(tempDir, '.ceps', 'snapshot.json');
        writeFile('src/index.ts', 'export const value = 1;\n');
        writeFile('README.md', '# Docs\n');
        await createSnapshotFixture();
    });
    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });
    it('returns match when snapshot aligns with working tree', async () => {
        const result = await verifySnapshot(tempDir, snapshotPath);
        expect(result.match).toBe(true);
        expect(result.mismatch).toBeUndefined();
        expect(result.reconciled).toBeUndefined();
    });
    it('detects added files', async () => {
        writeFile('src/new.ts', 'export const added = true;\n');
        const result = await verifySnapshot(tempDir, snapshotPath);
        expect(result.match).toBe(false);
        expect(result.mismatch?.added).toEqual(['src/new.ts']);
        expect(result.reconciled).toBeUndefined();
    });
    it('detects removed files', async () => {
        fs.unlinkSync(path.join(tempDir, 'src', 'index.ts'));
        const result = await verifySnapshot(tempDir, snapshotPath);
        expect(result.match).toBe(false);
        expect(result.mismatch?.removed).toEqual(['src/index.ts']);
        expect(result.reconciled).toBeUndefined();
    });
    it('detects changed files', async () => {
        writeFile('src/index.ts', 'export const value = 2;\n');
        const result = await verifySnapshot(tempDir, snapshotPath);
        expect(result.match).toBe(false);
        expect(result.mismatch?.changed).toEqual(['src/index.ts']);
        expect(result.reconciled).toBeUndefined();
    });
    it('marks mismatches as reconciled when option enabled', async () => {
        writeFile('src/index.ts', 'export const value = 2;\n');
        const result = await verifySnapshot(tempDir, snapshotPath, { reconcile: true });
        expect(result.match).toBe(false);
        expect(result.reconciled).toBe(true);
    });
    it('throws on unsupported snapshot version', async () => {
        const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
        snapshot.version = '2.0';
        fs.writeFileSync(snapshotPath, JSON.stringify(snapshot), 'utf8');
        await expect(verifySnapshot(tempDir, snapshotPath)).rejects.toThrow(/Unsupported snapshot version/);
    });
});
//# sourceMappingURL=verify.test.js.map