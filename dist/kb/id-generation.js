import * as crypto from 'crypto';
const BASE62_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
/**
 * Converts a Buffer to base62 representation with specified length.
 * Algorithm: Convert full hash to base62, then take leftmost N characters.
 * For 10 chars: ~60 bits of entropy (62^10 ≈ 2^59.5)
 * For 16 chars: ~96 bits of entropy (62^16 ≈ 2^95.3)
 * Padding: If hash produces fewer characters, pad with '0' on the left.
 */
function toBase62(buffer, length) {
    let num = BigInt('0x' + buffer.toString('hex'));
    let result = '';
    const base = BigInt(62);
    // Convert to base62 (builds string right-to-left)
    while (num > 0 && result.length < length) {
        const remainder = Number(num % base);
        result = BASE62_CHARS[remainder] + result;
        num = num / base;
    }
    // Pad to desired length (left-pad with '0')
    while (result.length < length) {
        result = '0' + result;
    }
    return result.slice(0, length);
}
export function normalizeContent(text) {
    return (text
        .normalize('NFKC') // Unicode normalization
        .toLowerCase() // Lowercase
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim() // Trim edges
        // Strip surrounding punctuation
        .replace(/^[^\w]+|[^\w]+$/g, ''));
}
export function generateAnchor(slug, content, existingAnchors = new Set()) {
    const normalized = normalizeContent(slug + ' ' + content);
    const hash = crypto.createHash('sha256').update(normalized, 'utf8').digest();
    // First try: 60 bits → 10 base62 chars
    let anchor = toBase62(hash, 10);
    if (!existingAnchors.has(anchor)) {
        return anchor;
    }
    // Collision: extend to 96 bits → 16 chars
    anchor = toBase62(hash, 16);
    if (!existingAnchors.has(anchor)) {
        return anchor;
    }
    // Still collides: append -2, -3, etc.
    for (let i = 2; i <= 99; i++) {
        const suffixed = `${anchor}-${i}`;
        if (!existingAnchors.has(suffixed)) {
            return suffixed;
        }
    }
    throw new Error('Anchor collision limit exceeded (99 suffixes)');
}
export function generateQID(filePath, entityKey, ambiguityKind, existingQIDs = new Set()) {
    // Normalize path to POSIX
    const normalizedPath = filePath.replace(/\\/g, '/');
    const input = normalizeContent(`${normalizedPath}|${entityKey}|${ambiguityKind}`);
    const hash = crypto.createHash('sha256').update(input, 'utf8').digest();
    // First try: 60 bits → 10 base62 chars
    const shortHash = toBase62(hash, 10);
    let qid = `q:${shortHash}`;
    if (!existingQIDs.has(qid)) {
        return qid;
    }
    // Collision: extend to 96 bits → 16 chars
    const longHash = toBase62(hash, 16);
    qid = `q:${longHash}`;
    if (!existingQIDs.has(qid)) {
        return qid;
    }
    // Still collides: append -2, -3, etc.
    for (let i = 2; i <= 99; i++) {
        const suffixed = `q:${longHash}-${i}`;
        if (!existingQIDs.has(suffixed)) {
            return suffixed;
        }
    }
    throw new Error('QID collision limit exceeded (99 suffixes)');
}
//# sourceMappingURL=id-generation.js.map