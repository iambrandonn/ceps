import { performance } from 'node:perf_hooks';
import { KnowledgeBase } from '../kb/knowledge-base.js';
import type { BehaviorChunk, AnswerRecord, Entity, FactSet } from '../kb/models.js';
import type { ImpactReport } from './impact-scope.js';
import type { LLMGateway } from '../llm/gateway.js';
import type { Validator, ChunkMetadata, GroundingDiagnostic } from '../validation/types.js';
import type { BudgetTracker, UsageStats } from '../llm/budget.js';
import { IntentLifter } from '../reasoning/IntentLifter.js';
import { PatternMatcher } from '../reasoning/PatternMatcher.js';
import { verifySnapshot, type VerificationResult } from '../snapshot/index.js';
import { withBudgetHelper } from '../llm/budget-helpers.js';

export interface SnapshotOptions {
  projectRoot: string;
  snapshotPath: string;
  reconcile?: boolean;
}

export interface ReanalysisOptions {
  deterministicMode: boolean;
  llmEnabled: boolean;
  llmBudgetTokens?: number;
  reasoningEnabled: boolean;
  llmGateway?: LLMGateway;
  validator?: Validator;
  budgetTracker?: BudgetTracker;
  snapshot?: SnapshotOptions;
}

export interface FailedEntity {
  entityId: string;
  reason: 'llm-failure' | 'grounding-reject' | 'kb-inconsistency';
  details: string;
  originalChunk?: BehaviorChunk;
}

export interface ReanalysisResult {
  updatedChunks: Map<string, BehaviorChunk>;
  failedEntities: FailedEntity[];
  warnings: string[];
  metrics: {
    tokensUsed: number;
    entitiesProcessed: number;
    entitiesFailed: number;
    runtimeMs: number;
  };
}

export class SnapshotMismatchError extends Error {
  constructor(public verification: VerificationResult) {
    const lines = [
      'Snapshot mismatch detected during finalize re-analysis.',
      mismatchSummary(verification)
    ].filter(Boolean);
    super(lines.join('\n'));
    this.name = 'SnapshotMismatchError';
  }
}

class PipelineFailure extends Error {
  constructor(
    public reason: FailedEntity['reason'],
    message: string,
    public diagnostics?: GroundingDiagnostic[]
  ) {
    super(message);
    this.name = 'PipelineFailure';
  }
}

export async function reanalyzeEntities(
  kb: KnowledgeBase,
  impactReport: ImpactReport,
  options: ReanalysisOptions
): Promise<ReanalysisResult> {
  const start = performance.now();
  const updatedChunks = new Map<string, BehaviorChunk>();
  const failedEntities: FailedEntity[] = [];
  const warnings = new Set<string>(impactReport.diagnostics.warnings);

  await verifyProjectSnapshot(options.snapshot, warnings);

  const answersByEntity = mapAnswersByEntity(kb, new Set(impactReport.seedQids));
  const matcher = options.reasoningEnabled ? new PatternMatcher(kb) : null;
  const lifter = matcher ? new IntentLifter(kb, matcher) : null;

  const initialUsage = options.budgetTracker?.getUsage();
  const processedEntities = impactReport.impactedEntities;

  for (const entityId of processedEntities) {
    try {
      const entity = kb.getEntity(entityId);
      if (!entity) {
        recordFailure(
          failedEntities,
          entityId,
          'kb-inconsistency',
          'Entity not found in KnowledgeBase'
        );
        continue;
      }

      const factSets = kb.getFactSetsBySubject(entityId);
      const existingChunks = kb.getChunksByEntity(entityId);
      const originalChunk = existingChunks.length > 0 ? existingChunks[0] : undefined;

      let reasonedChunk: BehaviorChunk | undefined;
      if (!originalChunk && !options.reasoningEnabled) {
        recordFailure(
          failedEntities,
          entityId,
          'kb-inconsistency',
          'No existing chunk and reasoning disabled',
          originalChunk
        );
        continue;
      }

      if (options.reasoningEnabled && factSets.length > 0 && lifter) {
        try {
          reasonedChunk = lifter.liftIntent(factSets.map((fs) => fs.id));
        } catch (error) {
          recordFailure(
            failedEntities,
            entityId,
            'kb-inconsistency',
            error instanceof Error ? error.message : String(error),
            originalChunk
          );
          continue;
        }
      }

      if (!originalChunk && !reasonedChunk) {
        recordFailure(
          failedEntities,
          entityId,
          'kb-inconsistency',
          'Unable to build behavior chunk for entity',
          originalChunk
        );
        continue;
      }

      const hydratedChunk = buildUpdatedChunk({
        entity,
        originalChunk,
        reasonedChunk,
        factSetIds: determineFactSetIds(originalChunk, reasonedChunk, factSets),
        answers: answersByEntity.get(entityId),
        fallbackConfidence: originalChunk?.confidence ?? reasonedChunk?.confidence ?? 'Medium'
      });

      const hasAnswers = (answersByEntity.get(entityId)?.length ?? 0) > 0;

      let finalChunk = hydratedChunk;

      if (!hasAnswers) {
        try {
          finalChunk = await runLLMPipeline({
            baseChunk: hydratedChunk,
            entity,
            factSets,
            options
          });
        } catch (error) {
          if (error instanceof PipelineFailure) {
            recordFailure(failedEntities, entityId, error.reason, error.message, originalChunk);
            error.diagnostics?.forEach((diag) =>
              warnings.add(`Grounding failure for ${entityId}: ${diag.reason}`)
            );
            continue;
          }

          recordFailure(
            failedEntities,
            entityId,
            'llm-failure',
            error instanceof Error ? error.message : String(error),
            originalChunk
          );
          continue;
        }
      } else if (options.validator) {
        // Validate human-provided answer once to ensure we surface grounding issues
        const metadata: ChunkMetadata = {
          chunkId: finalChunk.id,
          targetEntityId: entity.id,
          factSetIds: finalChunk.factSetIds,
          confidence: finalChunk.confidence
        };
        const validation = options.validator.validate(
          finalChunk.textDraft,
          metadata.factSetIds,
          metadata
        );
        if (validation.status === 'fallback') {
          recordFailure(
            failedEntities,
            entityId,
            'grounding-reject',
            validation.diagnostics[0]?.reason ?? 'Grounding validator rejected human answer',
            originalChunk
          );
          continue;
        }
        if (validation.status === 'retry') {
          warnings.add(
            `Validator requested retry for ${entityId}, but human answer prevented automatic retry.`
          );
        }
      }

      updatedChunks.set(entityId, finalChunk);
    } catch (error) {
      recordFailure(
        failedEntities,
        entityId,
        'kb-inconsistency',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  const tokensUsed = computeTokenUsage(options.budgetTracker, initialUsage);
  const runtimeMs = performance.now() - start;

  return {
    updatedChunks,
    failedEntities,
    warnings: Array.from(warnings),
    metrics: {
      tokensUsed,
      entitiesProcessed: processedEntities.length,
      entitiesFailed: failedEntities.length,
      runtimeMs
    }
  };
}

interface BuildChunkParams {
  entity: Entity;
  originalChunk?: BehaviorChunk;
  reasonedChunk?: BehaviorChunk;
  factSetIds: string[];
  answers?: AnswerRecord[];
  fallbackConfidence: BehaviorChunk['confidence'];
}

interface PipelineParams {
  baseChunk: BehaviorChunk;
  entity: Entity;
  factSets: FactSet[];
  options: ReanalysisOptions;
}

async function runLLMPipeline(params: PipelineParams): Promise<BehaviorChunk> {
  const { baseChunk, entity, factSets, options } = params;

  if (!options.llmEnabled || !options.llmGateway) {
    maybeValidateChunk(baseChunk, entity, options.validator);
    return baseChunk;
  }

  if (options.budgetTracker) {
    const estimate = 100;
    const budgetCheck = withBudgetHelper(options.budgetTracker, 'chunk', estimate);
    if (!budgetCheck.allowed) {
      throw new PipelineFailure(
        'llm-failure',
        `LLM budget exhausted while processing ${entity.id} (remaining tokens: ${budgetCheck.remaining})`
      );
    }
  }

  let attempt = 0;
  let promptKey: 'O' | 'R1' | 'R2' = 'O';
  const maxAttempts = 3;
  const guidance: string[] = [];

  while (attempt < maxAttempts) {
    try {
      const llmDraft = await options.llmGateway.summarize(factSets, 'spec-ready', {
        deterministic: options.deterministicMode,
        promptKey,
        guidance: guidance.length > 0 ? guidance : undefined
      });

      if (!options.validator) {
        return {
          ...baseChunk,
          textDraft: llmDraft
        };
      }

      const metadata: ChunkMetadata = {
        chunkId: baseChunk.id,
        targetEntityId: entity.id,
        factSetIds: baseChunk.factSetIds,
        confidence: baseChunk.confidence
      };

      const validation = options.validator.validate(llmDraft, metadata.factSetIds, metadata);

      if (validation.status === 'accept') {
        return {
          ...baseChunk,
          textDraft: llmDraft
        };
      }

      if (validation.status === 'retry' && attempt < maxAttempts - 1) {
        attempt++;
        promptKey = attempt === 1 ? 'R1' : 'R2';
        guidance.push(
          ...validation.diagnostics.map((diag) => diag.reason).filter((reason) => !!reason)
        );
        continue;
      }

      throw new PipelineFailure(
        'grounding-reject',
        validation.diagnostics[0]?.reason ??
          `Grounding validator rejected chunk for ${entity.id}`,
        validation.diagnostics
      );
    } catch (error) {
      if (error instanceof PipelineFailure) {
        throw error;
      }

      throw new PipelineFailure(
        'llm-failure',
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  throw new PipelineFailure(
    'grounding-reject',
    `Grounding validator failed after ${maxAttempts} attempts for ${entity.id}`
  );
}

function maybeValidateChunk(
  chunk: BehaviorChunk,
  entity: Entity,
  validator?: Validator
): void {
  if (!validator) return;

  const metadata: ChunkMetadata = {
    chunkId: chunk.id,
    targetEntityId: entity.id,
    factSetIds: chunk.factSetIds,
    confidence: chunk.confidence
  };

  const validation = validator.validate(chunk.textDraft, metadata.factSetIds, metadata);

  if (validation.status === 'accept') {
    return;
  }

  if (validation.status === 'fallback') {
    throw new PipelineFailure(
      'grounding-reject',
      validation.diagnostics[0]?.reason ??
        `Grounding validator rejected chunk for ${entity.id}`,
      validation.diagnostics
    );
  }

  throw new PipelineFailure(
    'grounding-reject',
    `Grounding validator requested retry for ${entity.id} but LLM pipeline is disabled`,
    validation.diagnostics
  );
}

function buildUpdatedChunk(params: BuildChunkParams): BehaviorChunk {
  const { entity, originalChunk, reasonedChunk, factSetIds, answers, fallbackConfidence } = params;

  const chunkId = originalChunk?.id ?? reasonedChunk?.id ?? `chunk-${entity.id}`;
  let textDraft = originalChunk?.textDraft ?? reasonedChunk?.textDraft ?? defaultTemplate(entity);
  let confidence = originalChunk?.confidence ?? reasonedChunk?.confidence ?? fallbackConfidence;
  const assumptions = originalChunk?.assumptions ?? reasonedChunk?.assumptions;

  if (answers && answers.length > 0) {
    textDraft = answers
      .map((answer) => answer.answer.trim())
      .filter((answer) => answer.length > 0)
      .join('\n\n');
    confidence = 'High';
  } else if (reasonedChunk) {
    textDraft = reasonedChunk.textDraft;
    confidence = reasonedChunk.confidence;
  }

  return {
    id: chunkId,
    targetEntityId: entity.id,
    textDraft,
    confidence,
    factSetIds,
    assumptions
  };
}

function defaultTemplate(entity: Entity): string {
  const label = entity.kind === 'function' ? 'Function' : 'Entity';
  return `${label} ${entity.name} (finalization template)`;
}

function determineFactSetIds(
  originalChunk: BehaviorChunk | undefined,
  reasonedChunk: BehaviorChunk | undefined,
  factSets: FactSet[]
): string[] {
  if (originalChunk?.factSetIds && originalChunk.factSetIds.length > 0) {
    return [...originalChunk.factSetIds];
  }
  if (reasonedChunk?.factSetIds && reasonedChunk.factSetIds.length > 0) {
    return [...reasonedChunk.factSetIds];
  }
  return factSets.map((fs) => fs.id);
}

function recordFailure(
  failures: FailedEntity[],
  entityId: string,
  reason: FailedEntity['reason'],
  details: string,
  originalChunk?: BehaviorChunk
): void {
  failures.push({
    entityId,
    reason,
    details,
    originalChunk
  });
}

function mapAnswersByEntity(kb: KnowledgeBase, scopedQids: Set<string>): Map<string, AnswerRecord[]> {
  const answers = new Map<string, AnswerRecord[]>();
  for (const answer of kb.getAllAnswers()) {
    if (scopedQids.size > 0 && !scopedQids.has(answer.qid)) {
      continue;
    }
    if (!answers.has(answer.entityId)) {
      answers.set(answer.entityId, []);
    }
    answers.get(answer.entityId)!.push(answer);
  }
  for (const [entityId, records] of answers.entries()) {
    records.sort((a, b) => a.qid.localeCompare(b.qid));
    answers.set(entityId, records);
  }
  return answers;
}

function computeTokenUsage(budgetTracker: BudgetTracker | undefined, initialUsage: UsageStats | undefined): number {
  if (!budgetTracker) return 0;
  const currentUsage = budgetTracker.getUsage();
  if (!initialUsage) {
    return currentUsage.totalTokens;
  }
  return Math.max(0, currentUsage.totalTokens - initialUsage.totalTokens);
}

async function verifyProjectSnapshot(
  snapshotOptions: SnapshotOptions | undefined,
  warnings: Set<string>
): Promise<void> {
  if (!snapshotOptions) return;

  const { projectRoot, snapshotPath, reconcile } = snapshotOptions;
  const verification = await verifySnapshot(projectRoot, snapshotPath, { reconcile });
  if (verification.match || verification.reconciled) {
    if (!verification.match && verification.reconciled) {
      warnings.add(
        `Snapshot mismatch reconciled for finalize run (${formatMismatch(verification)}).`
      );
    }
    return;
  }

  throw new SnapshotMismatchError(verification);
}

function mismatchSummary(verification: VerificationResult): string {
  if (verification.match) return '';
  return `Expected snapshot hash ${verification.expected.rootHash}, actual ${verification.actual.rootHash}. ${formatMismatch(verification)}`;
}

function formatMismatch(verification: VerificationResult): string {
  if (!verification.mismatch) return '';
  const parts: string[] = [];
  if (verification.mismatch.added.length) {
    parts.push(`added: ${verification.mismatch.added.join(', ')}`);
  }
  if (verification.mismatch.removed.length) {
    parts.push(`removed: ${verification.mismatch.removed.join(', ')}`);
  }
  if (verification.mismatch.changed.length) {
    parts.push(`changed: ${verification.mismatch.changed.join(', ')}`);
  }
  return parts.join(' | ');
}
