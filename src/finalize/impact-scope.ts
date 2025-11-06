import path from 'path';
import { KnowledgeBase, KBError } from '../kb/knowledge-base.js';
import type { AnswerRecord, Entity } from '../kb/models.js';

const POSIX = path.posix;
const DEFAULT_MAX_HOPS = 3;
const DEFAULT_MAX_NODES = 250;

export interface ImpactScopeOptions {
  maxHops?: number;
  maxNodes?: number;
  scope?: 'auto' | 'full';
  includeDirectories?: boolean;
}

export interface ImpactReport {
  seedQids: string[];
  resolvedEntities: string[];
  impactedEntities: string[];
  impactedDirectories: string[];
  diagnostics: {
    hopsTraversed: number;
    nodesTraversed: number;
    capped: boolean;
    excluded: string[];
    warnings: string[];
  };
}

interface TraversalNode {
  id: string;
  hop: number;
}

interface NormalizedOptions {
  maxHops: number;
  maxNodes: number;
  scope: 'auto' | 'full';
  includeDirectories: boolean;
}

export function computeImpactReport(
  kb: KnowledgeBase,
  resolvedQids: string[],
  options: ImpactScopeOptions = {}
): ImpactReport {
  const normalized = normalizeOptions(options);
  const answerRecords = collectAnswerRecords(kb, resolvedQids);
  const seedQids = Array.from(new Set(answerRecords.map((record) => record.qid))).sort();
  const resolvedEntities = Array.from(
    new Set(answerRecords.map((record) => record.entityId))
  ).sort();

  const impactedEntities = new Set<string>(resolvedEntities);
  const visitedNodes = new Set<string>();
  const excludedNodes = new Set<string>();
  const unresolvedNodes = new Set<string>();
  const queue: TraversalNode[] = [];

  for (const entityId of resolvedEntities) {
    queue.push({ id: entityId, hop: 0 });
    visitedNodes.add(entityId);
  }

  let maxHop = 0;
  let hopCapHit = false;
  let nodeCapHit = false;

  while (queue.length > 0) {
    const current = queue.shift()!;
    maxHop = Math.max(maxHop, current.hop);

    const entitiesForNode = resolveNodeToEntities(kb, current.id);
    if (entitiesForNode.length === 0) {
      // Keep track of nodes that we cannot map back to entities for diagnostics
      unresolvedNodes.add(current.id);
    } else {
      entitiesForNode.forEach((entityId) => impactedEntities.add(entityId));
    }

    const neighbors = Array.from(kb.getReverseDeps(current.id)).sort();
    for (const neighbor of neighbors) {
      if (visitedNodes.has(neighbor)) {
        continue;
      }

      const nextHop = current.hop + 1;
      if (normalized.scope === 'auto' && nextHop > normalized.maxHops) {
        hopCapHit = true;
        excludedNodes.add(neighbor);
        continue;
      }

      if (normalized.scope === 'auto' && visitedNodes.size >= normalized.maxNodes) {
        nodeCapHit = true;
        excludedNodes.add(neighbor);
        continue;
      }

      visitedNodes.add(neighbor);
      queue.push({ id: neighbor, hop: nextHop });
    }
  }

  const impactedDirectories = computeImpactedDirectories(kb, impactedEntities);
  const diagnosticsWarnings = buildWarnings({
    scope: normalized.scope,
    maxHops: normalized.maxHops,
    maxNodes: normalized.maxNodes,
    nodesTraversed: visitedNodes.size,
    hopCapHit,
    nodeCapHit,
    excludedCount: excludedNodes.size,
    unresolvedNodes
  });

  return {
    seedQids,
    resolvedEntities,
    impactedEntities: Array.from(impactedEntities).sort(),
    impactedDirectories: normalized.includeDirectories ? impactedDirectories : [],
    diagnostics: {
      hopsTraversed: maxHop,
      nodesTraversed: visitedNodes.size,
      capped: hopCapHit || nodeCapHit,
      excluded: Array.from(excludedNodes).sort(),
      warnings: diagnosticsWarnings
    }
  };
}

function normalizeOptions(options: ImpactScopeOptions): NormalizedOptions {
  const scope = options.scope ?? 'auto';
  return {
    scope,
    maxHops: scope === 'full' ? Number.POSITIVE_INFINITY : options.maxHops ?? DEFAULT_MAX_HOPS,
    maxNodes: scope === 'full' ? Number.POSITIVE_INFINITY : options.maxNodes ?? DEFAULT_MAX_NODES,
    includeDirectories: options.includeDirectories ?? true
  };
}

function collectAnswerRecords(kb: KnowledgeBase, qids: string[]): AnswerRecord[] {
  return qids.map((qid) => {
    const record = kb.getAnswer(qid);
    if (!record) {
      throw new KBError(`Cannot compute impact scope; answer not found for QID: ${qid}`);
    }
    return record;
  });
}

function resolveNodeToEntities(kb: KnowledgeBase, nodeId: string): string[] {
  const entity = kb.getEntity(nodeId);
  if (entity) {
    return [entity.id];
  }

  const entities = kb.findByPath(nodeId);
  if (entities.length > 0) {
    return entities.map((item) => item.id);
  }
  return [];
}

function computeImpactedDirectories(kb: KnowledgeBase, impactedEntities: Set<string>): string[] {
  const directories = new Set<string>(['spec.md']);

  for (const entityId of impactedEntities) {
    const entity = kb.getEntity(entityId);
    if (!entity) {
      continue;
    }
    addDirectoryPaths(entity, directories);
    addPackagePaths(entity, directories);
  }

  return Array.from(directories).sort();
}

function addDirectoryPaths(entity: Entity, directories: Set<string>): void {
  const dir = POSIX.dirname(entity.path);
  if (dir && dir !== '.') {
    directories.add(`${dir}/spec.md`);
  }
}

function addPackagePaths(entity: Entity, directories: Set<string>): void {
  if (!entity.path.includes('/')) {
    return;
  }

  const segments = entity.path.split('/');
  const packagesIndex = segments.indexOf('packages');

  if (packagesIndex !== -1 && packagesIndex < segments.length - 1) {
    const srcIndex = segments.indexOf('src', packagesIndex);
    const endIndex = srcIndex === -1 ? packagesIndex + 2 : srcIndex;
    const packagePath = segments.slice(packagesIndex, Math.max(endIndex, packagesIndex + 2)).join('/');
    directories.add(`${packagePath}/spec.md`);
    return;
  }

  if (entity.packageId) {
    // Derive a synthetic package path using first directory segment as fallback
    const packagePath = segments.slice(0, 1).join('/');
    if (packagePath && packagePath !== '.') {
      directories.add(`${packagePath}/spec.md`);
    }
  }
}

interface WarningParams {
  scope: 'auto' | 'full';
  maxHops: number;
  maxNodes: number;
  nodesTraversed: number;
  hopCapHit: boolean;
  nodeCapHit: boolean;
  excludedCount: number;
  unresolvedNodes: Set<string>;
}

function buildWarnings(params: WarningParams): string[] {
  const warnings = new Set<string>();

  if (params.scope === 'auto' && params.nodeCapHit) {
    warnings.add(
      `Impact traversal reached node cap (maxNodes=${Number.isFinite(params.maxNodes) ? params.maxNodes : '∞'}); ${params.excludedCount} nodes were excluded. Consider increasing --finalize-max-nodes or using --finalize-scope full.`
    );
  }

  if (params.scope === 'auto' && params.hopCapHit) {
    warnings.add(
      `Impact traversal reached hop cap (maxHops=${Number.isFinite(params.maxHops) ? params.maxHops : '∞'}). Consider raising --finalize-max-hops or using --finalize-scope full.`
    );
  }

  if (params.scope === 'auto' && Number.isFinite(params.maxNodes) && params.maxNodes > 0) {
    const usageRatio = params.nodesTraversed / params.maxNodes;
    if (usageRatio >= 0.8) {
      const percentage = Math.round(usageRatio * 100);
      warnings.add(
        `Impact traversal visited ${params.nodesTraversed}/${params.maxNodes} nodes (${percentage}% of maxNodes). Consider increasing --finalize-max-nodes or using --finalize-scope full.`
      );
    }
  }

  if (params.unresolvedNodes.size > 0) {
    const sample = Array.from(params.unresolvedNodes).slice(0, 5).join(', ');
    warnings.add(
      `Skipped ${params.unresolvedNodes.size} nodes with no matching entities or files (${sample}).`
    );
  }

  return Array.from(warnings).sort();
}
