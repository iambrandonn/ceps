import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { MarkdownRenderer } from '../generator/markdown-renderer.js';
import { KBError } from '../kb/knowledge-base.js';
const POSIX = path.posix;
const ANCHOR_REGEX = /^<a id="([\w:-]+)"><\/a>$/u;
const SUMMARY_HEADING = '## Finalization Summary';
const DEFAULT_NOTES_PLACEHOLDER = '  - None';
export function patchSpecificationFiles(projectRoot, kb, impactReport, reanalysis, options = {}) {
    const fsApi = options.fs ?? fs;
    const deterministic = options.deterministic ?? false;
    const now = options.timestamp ?? (() => new Date().toISOString());
    const renderer = new MarkdownRenderer();
    const warnings = new Set(reanalysis.warnings);
    const baseFailures = [...reanalysis.failedEntities];
    const failureEntityIds = new Set(baseFailures.map((failure) => failure.entityId));
    const answersByQid = new Map();
    for (const answer of kb.getAllAnswers()) {
        answersByQid.set(answer.qid, answer);
    }
    const resolvedByEntity = mapResolvedQidsByEntity(impactReport.seedQids, answersByQid);
    const entityUpdatesBySpec = groupUpdatesBySpecPath(kb, reanalysis.updatedChunks, resolvedByEntity, failureEntityIds);
    const patchedFiles = [];
    const additionalFailures = [];
    const resolvedQids = [];
    for (const [specPath, updates] of entityUpdatesBySpec) {
        const absolutePath = path.resolve(projectRoot, specPath);
        if (!fsApi.existsSync(absolutePath)) {
            additionalFailures.push(...updates.map((update) => ({
                entityId: update.entity.id,
                reason: 'spec-missing',
                details: `Specification file not found for ${update.entity.id} (${specPath}).`
            })));
            warnings.add(`Specification file missing: ${specPath}`);
            continue;
        }
        const original = fsApi.readFileSync(absolutePath, 'utf8');
        const applyResult = applyEntityUpdates(original, updates, renderer, kb);
        additionalFailures.push(...applyResult.failures);
        if (applyResult.successes.length === 0 && updates.length > 0) {
            continue;
        }
        const sections = [];
        const resolvedInFile = new Set();
        const notes = [];
        for (const success of applyResult.successes) {
            const { update } = success;
            sections.push({ entityId: update.entity.id, entityName: update.entity.name });
            updateEntityChunks(kb, success.update.chunk);
            const qids = update.qidsToResolve;
            for (const qid of qids) {
                const answer = answersByQid.get(qid);
                if (answer) {
                    notes.push({ qid, text: summarizeAnswer(answer.answer) });
                }
                resolvedInFile.add(qid);
            }
        }
        const summary = buildSummaryBlock({
            resolvedQids: Array.from(resolvedInFile).sort(),
            sections: sections.sort((a, b) => a.entityName.localeCompare(b.entityName)),
            notes: notes.sort((a, b) => a.qid.localeCompare(b.qid)),
            deterministic,
            timestamp: now
        });
        const withSummary = injectSummaryBlock(applyResult.content, summary, deterministic);
        writeFileAtomic(fsApi, absolutePath, withSummary);
        patchedFiles.push({
            path: normalizeSpecPath(projectRoot, absolutePath),
            sectionsUpdated: sections
        });
        for (const qid of resolvedInFile) {
            try {
                kb.markQIDResolved(qid);
                resolvedQids.push(qid);
            }
            catch (error) {
                if (error instanceof KBError) {
                    warnings.add(`Failed to mark QID ${qid} resolved: ${error.message}`);
                }
                else {
                    warnings.add(`Unexpected error marking QID ${qid} resolved: ${String(error)}`);
                }
            }
        }
    }
    const rootSummary = buildSummaryBlock({
        resolvedQids: resolvedQids.slice().sort(),
        sections: dedupeSections(patchedFiles),
        notes: collectNotesForRoot(resolvedQids, answersByQid),
        deterministic,
        timestamp: now
    });
    if (resolvedQids.length > 0 || dedupeSections(patchedFiles).length > 0) {
        const rootSpecPath = path.resolve(projectRoot, 'spec.md');
        if (fsApi.existsSync(rootSpecPath)) {
            const rootContent = fsApi.readFileSync(rootSpecPath, 'utf8');
            const updatedRoot = injectSummaryBlock(rootContent, rootSummary, deterministic);
            writeFileAtomic(fsApi, rootSpecPath, updatedRoot);
            patchedFiles.push({
                path: normalizeSpecPath(projectRoot, rootSpecPath),
                sectionsUpdated: dedupeSections(patchedFiles)
            });
        }
        else {
            warnings.add('Root specification file not found; skipping finalization summary.');
        }
    }
    return {
        patchedFiles: sortPatchedFiles(patchedFiles),
        failedEntities: sortFailures([...baseFailures, ...additionalFailures]),
        resolvedQids: resolvedQids.sort(),
        warnings: Array.from(warnings).sort()
    };
}
function mapResolvedQidsByEntity(qids, answers) {
    const map = new Map();
    for (const qid of qids) {
        const record = answers.get(qid);
        if (!record)
            continue;
        if (!map.has(record.entityId)) {
            map.set(record.entityId, []);
        }
        map.get(record.entityId).push(qid);
    }
    return map;
}
function groupUpdatesBySpecPath(kb, updatedChunks, resolvedQids, failedEntities) {
    const result = new Map();
    for (const [entityId, chunk] of updatedChunks.entries()) {
        if (failedEntities.has(entityId))
            continue;
        const entity = kb.getEntity(entityId);
        if (!entity)
            continue;
        const specPath = deriveSpecPath(entity);
        if (!result.has(specPath)) {
            result.set(specPath, []);
        }
        result.get(specPath).push({
            entity,
            chunk,
            qidsToResolve: resolvedQids.get(entityId) ?? []
        });
    }
    return result;
}
function deriveSpecPath(entity) {
    const directory = POSIX.dirname(entity.path);
    if (!directory || directory === '.') {
        return 'spec.md';
    }
    return `${directory}/spec.md`;
}
function applyEntityUpdates(content, updates, renderer, kb) {
    if (updates.length === 0) {
        return { content, successes: [], failures: [] };
    }
    const lines = splitLines(content);
    const anchorMap = buildAnchorMap(lines);
    const replacements = [];
    const successes = [];
    const failures = [];
    for (const update of updates) {
        const anchor = anchorMap.get(update.entity.id);
        if (!anchor) {
            failures.push({
                entityId: update.entity.id,
                reason: 'anchor-missing',
                details: `Anchor not found for entity ${update.entity.id} (${update.entity.name}).`
            });
            continue;
        }
        const openQuestions = collectOpenQuestions(kb, update);
        const rendered = renderer.renderEntity(update.entity, [update.chunk], openQuestions);
        replacements.push({ span: anchor, rendered, update });
    }
    if (replacements.length === 0) {
        return { content, successes, failures };
    }
    replacements.sort((a, b) => b.span.start - a.span.start);
    const mutableLines = [...lines];
    for (const replacement of replacements) {
        mutableLines.splice(replacement.span.start, replacement.span.end - replacement.span.start, ...splitLines(trimTrailingNewlines(replacement.rendered)));
        successes.push({ update: replacement.update, rendered: replacement.rendered });
    }
    return {
        content: joinLines(mutableLines),
        successes,
        failures
    };
}
function buildAnchorMap(lines) {
    const map = new Map();
    const anchors = [];
    for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(ANCHOR_REGEX);
        if (match) {
            anchors.push({ id: match[1], index: i });
        }
    }
    for (let i = 0; i < anchors.length; i++) {
        const current = anchors[i];
        const next = anchors[i + 1];
        map.set(current.id, {
            start: current.index,
            end: next ? next.index : lines.length
        });
    }
    return map;
}
function collectOpenQuestions(kb, update) {
    const existing = kb.getOpenQuestionsByEntity(update.entity.id);
    if (update.qidsToResolve.length === 0) {
        return existing;
    }
    const resolved = new Set(update.qidsToResolve);
    return existing.filter((question) => !resolved.has(question.qid));
}
function injectSummaryBlock(content, summary, deterministic) {
    const existingBlocks = extractSummaryBlocks(content);
    const base = existingBlocks.cleaned;
    const insertion = deterministic
        ? summary
        : [summary, ...existingBlocks.blocks].join('\n\n').trim();
    const insertionPoint = findInsertionIndex(base);
    if (insertionPoint === -1) {
        return `${summary}\n\n${base}`.trimEnd();
    }
    const before = base.slice(0, insertionPoint);
    const after = base.slice(insertionPoint);
    return `${before}\n\n${insertion}\n\n${after}`.replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
function buildSummaryBlock(params) {
    const lines = [SUMMARY_HEADING];
    lines.push(`- Resolved QIDs: ${params.resolvedQids.length}`);
    lines.push(`- Updated Sections: ${params.sections.length > 0
        ? params.sections.map((section) => `${section.entityName} (${section.entityId})`).join(', ')
        : 'None'}`);
    lines.push('- Notes:');
    if (params.notes.length === 0) {
        lines.push(DEFAULT_NOTES_PLACEHOLDER);
    }
    else {
        for (const note of params.notes) {
            lines.push(`  - ${note.qid}: ${note.text}`);
        }
    }
    if (!params.deterministic) {
        lines.push(`- Finalized: ${params.timestamp()}`);
    }
    return lines.join('\n');
}
function extractSummaryBlocks(content) {
    const lines = splitLines(content);
    const blocks = [];
    const retained = [];
    let index = 0;
    while (index < lines.length) {
        const line = lines[index];
        if (line === SUMMARY_HEADING) {
            const blockLines = [line];
            index += 1;
            while (index < lines.length) {
                const current = lines[index];
                blockLines.push(current);
                const next = lines[index + 1];
                if (current.trim() === '' &&
                    (next === undefined ||
                        next.startsWith('#') ||
                        next.startsWith('**'))) {
                    index += 1;
                    break;
                }
                index += 1;
            }
            while (blockLines.length > 0 && blockLines[blockLines.length - 1].trim() === '') {
                blockLines.pop();
            }
            blocks.push(blockLines.join('\n'));
            while (index < lines.length && lines[index].trim() === '') {
                index += 1;
            }
        }
        else {
            retained.push(line);
            index += 1;
        }
    }
    const cleanedContent = joinLines(retained).replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
    return {
        cleaned: cleanedContent,
        blocks
    };
}
function findInsertionIndex(content) {
    const doubleNewline = content.indexOf('\n\n');
    if (doubleNewline === -1) {
        return content.length;
    }
    return doubleNewline + 2;
}
function summarizeAnswer(answer) {
    const lines = answer
        .split(/\r?\n/u)
        .map((line) => line.replace(/^\s*-\s*/u, '').trim())
        .filter((line) => line.length > 0);
    if (lines.length === 0) {
        return 'Answer provided';
    }
    const summary = lines[0];
    return summary.length > 160 ? `${summary.slice(0, 157)}...` : summary;
}
function updateEntityChunks(kb, chunk) {
    const existing = kb.getChunk(chunk.id);
    if (existing) {
        kb.updateChunk(chunk.id, {
            textDraft: chunk.textDraft,
            factSetIds: [...chunk.factSetIds],
            confidence: chunk.confidence,
            assumptions: chunk.assumptions ? [...chunk.assumptions] : undefined
        });
        return;
    }
    kb.insertChunk(chunk);
}
function dedupeSections(files) {
    const map = new Map();
    for (const file of files) {
        for (const section of file.sectionsUpdated) {
            if (!map.has(section.entityId)) {
                map.set(section.entityId, section);
            }
        }
    }
    return Array.from(map.values()).sort((a, b) => a.entityName.localeCompare(b.entityName));
}
function collectNotesForRoot(qids, answers) {
    const unique = new Map();
    for (const qid of qids) {
        const answer = answers.get(qid);
        if (!answer)
            continue;
        if (!unique.has(qid)) {
            unique.set(qid, { qid, text: summarizeAnswer(answer.answer) });
        }
    }
    return Array.from(unique.values()).sort((a, b) => a.qid.localeCompare(b.qid));
}
function splitLines(content) {
    return content.replace(/\r\n/g, '\n').split('\n');
}
function joinLines(lines) {
    return lines.join('\n');
}
function trimTrailingNewlines(value) {
    return `${value.replace(/\s+$/u, '')}\n`;
}
function normalizeSpecPath(root, absolute) {
    const relative = path.relative(root, absolute).replace(/\\/g, '/');
    return relative === '' ? 'spec.md' : relative;
}
function sortPatchedFiles(files) {
    return files
        .map((file) => ({
        path: file.path,
        sectionsUpdated: file.sectionsUpdated.slice().sort((a, b) => a.entityName.localeCompare(b.entityName))
    }))
        .sort((a, b) => a.path.localeCompare(b.path));
}
function sortFailures(failures) {
    return failures
        .map((failure) => ({
        ...failure,
        details: failure.details
    }))
        .sort((a, b) => a.entityId.localeCompare(b.entityId));
}
function writeFileAtomic(fsAdapter, targetPath, content) {
    const adapter = fsAdapter ?? fs;
    const tempPath = `${targetPath}.${randomUUID()}.tmp`;
    adapter.writeFileSync(tempPath, content, 'utf8');
    fs.renameSync(tempPath, targetPath);
}
//# sourceMappingURL=spec-patcher.js.map