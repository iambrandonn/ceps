import fs from 'fs';

/**
 * Normalize file content according to CTS-04 requirements.
 *
 * @param buffer - Raw file contents
 * @returns Normalized text (UTF-8, LF endings, trimmed trailing whitespace)
 */
export function normalizeContent(buffer: Buffer): string {
  if (buffer.length === 0) {
    return '';
  }

  let text = buffer.toString('utf8');

  // Strip UTF-8 BOM if present
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  // Normalize line endings to LF
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Trim trailing whitespace for each line
  const lines = text.split('\n').map((line) => line.replace(/\s+$/u, ''));
  return lines.join('\n');
}

/**
 * Read a file from disk and return normalized content along with the raw byte size.
 */
export function readAndNormalizeFile(path: string): { normalized: string; bytes: number } {
  const buffer = fs.readFileSync(path);
  return {
    normalized: normalizeContent(buffer),
    bytes: buffer.length,
  };
}
