import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { IgnoreRules } from '../scanner/ignore-rules.js';
import { readAndNormalizeFile } from './normalize.js';
import { buildMerkleRoot, sha256 } from './hash.js';
import { SnapshotDocument, SnapshotFileEntry } from './types.js';

export interface CaptureOptions {
  root: string;
  include?: string[];
  exclude?: string[];
}

const DEFAULT_EXCLUDE = [
  '**/spec.md',
  'spec.md',
  '.ceps/**',
  '**/.ceps/**'
];

const ALLOWED_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.json',
  '.yaml',
  '.yml',
  '.sql',
  '.md'
]);

function shouldIncludeFile(relPath: string): boolean {
  if (relPath.endsWith('spec.md')) {
    return false;
  }

  const ext = path.extname(relPath).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

/**
 * Capture a deterministic snapshot of the workspace rooted at {@link CaptureOptions.root}.
 * Files are filtered using allowed extensions and ignore rules, normalised per CTS-04,
 * and hashed to produce a Merkle root recorded in the returned document.
 */
export async function captureSnapshot({ root, include = ['**/*'], exclude = DEFAULT_EXCLUDE }: CaptureOptions): Promise<SnapshotDocument> {
  const ignoreRules = new IgnoreRules(root, { ignore: exclude });

  const candidates = await glob(include, {
    cwd: root,
    absolute: true,
    nodir: true,
    dot: true
  });

  const entries: SnapshotFileEntry[] = [];

  for (const absolutePath of candidates) {
    const relativePath = path.relative(root, absolutePath).replace(/\\/g, '/');

    if (ignoreRules.shouldIgnore(relativePath)) {
      continue;
    }

    if (!shouldIncludeFile(relativePath)) {
      continue;
    }

    const { normalized, bytes } = readAndNormalizeFile(absolutePath);
    const hash = sha256(normalized);
    entries.push({ path: relativePath, hash, bytes });
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));

  const rootHash = buildMerkleRoot(entries.map((entry) => ({ path: entry.path, hash: entry.hash })));

  return {
    version: '1.0',
    algorithm: 'sha256',
    rootHash,
    generatedAt: new Date().toISOString(),
    files: entries
  };
}

/**
 * Persist a snapshot document to disk using an atomic write (temp file + rename).
 */
export function writeSnapshot(document: SnapshotDocument, outputPath: string): void {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const tempPath = `${outputPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(document, null, 2), 'utf8');
  fs.renameSync(tempPath, outputPath);
}
