/**
 * Phase 3 Step 7: Orchestrator
 *
 * Coordinates the full Phase 3 intelligence pipeline with 10 phases:
 * scanning → parsing → relation-resolution → graph-building → reasoning →
 * ambiguity-resolution → validation-pre → generation → validation-post → complete
 *
 * Features:
 * - Event-based progress reporting (phaseStart, phaseComplete, phaseError)
 * - Fail-fast validation gates (halt on coverage/link failures)
 * - Statistics tracking (filesScanned, entitiesFound, coverage, etc.)
 * - Partial execution support (runUntil for testing)
 */
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { KnowledgeBase } from '../kb/knowledge-base.js';
import { Scanner } from '../scanner/scanner.js';
import { Parser } from '../parser/parser.js';
import { RelationResolver } from '../reasoning/relation-resolver.js';
import { IntentLifter } from '../reasoning/IntentLifter.js';
import { AmbiguityResolver } from '../reasoning/ambiguity-resolver.js';
import { CrossLinkValidator } from '../validation/cross-link-validator.js';
import { SpecGenerator } from '../generator/spec-generator.js';
import { PatternMatcher } from '../reasoning/PatternMatcher.js';
export var PipelinePhase;
(function (PipelinePhase) {
    PipelinePhase["SCANNING"] = "scanning";
    PipelinePhase["PARSING"] = "parsing";
    PipelinePhase["RELATION_RESOLUTION"] = "relation-resolution";
    PipelinePhase["GRAPH_BUILDING"] = "graph-building";
    PipelinePhase["REASONING"] = "reasoning";
    PipelinePhase["AMBIGUITY_RESOLUTION"] = "ambiguity-resolution";
    PipelinePhase["VALIDATION_PRE"] = "validation-pre";
    PipelinePhase["GENERATION"] = "generation";
    PipelinePhase["VALIDATION_POST"] = "validation-post";
    PipelinePhase["COMPLETE"] = "complete";
})(PipelinePhase || (PipelinePhase = {}));
export class Orchestrator extends EventEmitter {
    kb;
    status;
    fileIndex; // Store scanner output for parsing phase
    options;
    rootPath;
    constructor(options) {
        super();
        // Support legacy string constructor for backwards compatibility
        if (typeof options === 'string') {
            this.options = { projectRoot: options, llm: 'off' };
            this.rootPath = options;
        }
        else {
            this.options = options;
            this.rootPath = options.projectRoot;
        }
        this.kb = new KnowledgeBase();
        this.status = {
            currentPhase: PipelinePhase.SCANNING,
            startTime: new Date(),
            statistics: {
                filesScanned: 0,
                entitiesFound: 0,
                relationsResolved: 0,
                chunksGenerated: 0,
                openQuestions: 0,
                coverage: 0
            },
            errors: []
        };
    }
    async run() {
        const phases = [
            PipelinePhase.SCANNING,
            PipelinePhase.PARSING,
            PipelinePhase.RELATION_RESOLUTION,
            PipelinePhase.GRAPH_BUILDING,
            PipelinePhase.REASONING,
            PipelinePhase.AMBIGUITY_RESOLUTION,
            PipelinePhase.VALIDATION_PRE,
            PipelinePhase.GENERATION,
            PipelinePhase.VALIDATION_POST,
            PipelinePhase.COMPLETE
        ];
        for (const phase of phases) {
            await this.executePhase(phase);
        }
    }
    async runUntil(targetPhase) {
        const phases = Object.values(PipelinePhase);
        const targetIndex = phases.indexOf(targetPhase);
        for (let i = 0; i <= targetIndex; i++) {
            await this.executePhase(phases[i]);
        }
    }
    async executePhase(phase) {
        this.status.currentPhase = phase;
        this.emit('phaseStart', phase);
        try {
            switch (phase) {
                case PipelinePhase.SCANNING:
                    await this.runScanning();
                    break;
                case PipelinePhase.PARSING:
                    await this.runParsing();
                    break;
                case PipelinePhase.RELATION_RESOLUTION:
                    await this.runRelationResolution();
                    break;
                case PipelinePhase.GRAPH_BUILDING:
                    await this.runGraphBuilding();
                    break;
                case PipelinePhase.REASONING:
                    await this.runReasoning();
                    break;
                case PipelinePhase.AMBIGUITY_RESOLUTION:
                    await this.runAmbiguityResolution();
                    break;
                case PipelinePhase.VALIDATION_PRE:
                    await this.runPreValidation();
                    break;
                case PipelinePhase.GENERATION:
                    await this.runGeneration();
                    break;
                case PipelinePhase.VALIDATION_POST:
                    await this.runPostValidation();
                    break;
                case PipelinePhase.COMPLETE:
                    // No-op
                    break;
            }
            this.emit('phaseComplete', phase);
        }
        catch (error) {
            this.handlePhaseError(phase, error);
        }
    }
    async runScanning() {
        const scanner = new Scanner(this.rootPath);
        this.fileIndex = await scanner.scan();
        this.status.statistics.filesScanned = this.fileIndex.entries.length;
    }
    async runParsing() {
        if (!this.fileIndex) {
            throw new Error('Scanning phase must complete before parsing');
        }
        const parser = new Parser();
        const codeFiles = this.fileIndex.entries.filter(e => e.kind === 'code');
        for (const entry of codeFiles) {
            const source = fs.readFileSync(entry.absolutePath, 'utf8');
            await parser.parseAndStore(entry.path, source, this.kb);
        }
        this.status.statistics.entitiesFound = this.kb.getAllEntities().length;
    }
    async runRelationResolution() {
        const resolver = new RelationResolver(this.kb);
        const relations = this.kb.getRelations(); // Get all relations (no argument)
        const resolved = resolver.resolve(relations);
        // Replace relations in KB
        this.kb.replaceRelations(resolved);
        const resolvedCount = resolved.filter(r => r.details?.resolved).length;
        this.status.statistics.relationsResolved = resolvedCount;
    }
    async runGraphBuilding() {
        // Force graph index computation by calling getters
        // These methods cache results on first call
        this.kb.getCallGraph();
        this.kb.getImportGraph();
        // Note: getReverseDeps(entityId) is entity-specific; cache built on first getCallGraph/getImportGraph call
    }
    async runReasoning() {
        const matcher = new PatternMatcher(this.kb);
        const lifter = new IntentLifter(this.kb, matcher);
        const entities = this.kb.getAllEntities();
        for (const entity of entities) {
            // Get factSets for this entity
            const factSets = this.kb.getFactSetsBySubject(entity.id);
            if (factSets.length > 0) {
                const chunk = lifter.liftIntent(factSets.map(fs => fs.id));
                this.kb.insertChunk(chunk);
            }
        }
        this.status.statistics.chunksGenerated = this.kb.getAllChunks().length;
    }
    async runAmbiguityResolution() {
        const resolver = new AmbiguityResolver(this.kb);
        const result = resolver.resolve({ maxIterations: 10 });
        this.status.statistics.openQuestions = result.openQuestions.length;
    }
    async runPreValidation() {
        const validator = new CrossLinkValidator(this.kb);
        const result = validator.validatePreGeneration();
        this.status.statistics.coverage = result.coverage;
        if (!result.passed) {
            // Build detailed error message with entity information
            const missingDetails = result.missingEntities.map(id => {
                const entity = this.kb.getEntity(id);
                if (entity) {
                    return `  - ${entity.kind} "${entity.name}" at ${entity.path}`;
                }
                return `  - Unknown entity ${id}`;
            }).join('\n');
            throw new Error(`Coverage gate failed: ${result.missingEntities.length} entities missing BehaviorChunk or QID\n` +
                `Missing entities:\n${missingDetails}\n\n` +
                `Suggestion: Ensure all exported entities have documentation or carry Open Questions.`);
        }
    }
    async runGeneration() {
        if (!this.fileIndex) {
            throw new Error('Scanning phase must complete before generation');
        }
        // Phase 4: Build generator options with LLM components
        const generatorOptions = {
            llmEnabled: this.options.llm === 'on',
            deterministicMode: this.options.deterministic,
            llmGateway: this.options.llmGateway,
            validator: this.options.validator,
            budgetTracker: this.options.budgetTracker
        };
        const generator = new SpecGenerator(this.kb, this.fileIndex, generatorOptions);
        // Generate root spec
        const rootSpec = generator.generateRootSpec(this.rootPath);
        const rootSpecPath = path.join(this.rootPath, 'spec.md');
        fs.writeFileSync(rootSpecPath, rootSpec, 'utf8');
        // Generate directory/package specs (async for Phase 4 LLM polish)
        const dirSpecs = await generator.generateDirectorySpecsAsync(this.rootPath);
        for (const [specPath, content] of Object.entries(dirSpecs)) {
            const fullPath = path.join(this.rootPath, specPath);
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(fullPath, content, 'utf8');
        }
    }
    async runPostValidation() {
        if (!this.fileIndex) {
            throw new Error('Scanning phase must complete before validation');
        }
        const validator = new CrossLinkValidator(this.kb);
        // Phase 4: Build generator options
        const generatorOptions = {
            llmEnabled: this.options.llm === 'on',
            deterministicMode: this.options.deterministic,
            llmGateway: this.options.llmGateway,
            validator: this.options.validator,
            budgetTracker: this.options.budgetTracker
        };
        const generator = new SpecGenerator(this.kb, this.fileIndex, generatorOptions);
        // Re-generate specs to get content for validation
        const rootSpec = generator.generateRootSpec(this.rootPath);
        const dirSpecs = await generator.generateDirectorySpecsAsync(this.rootPath);
        // Convert to SpecFile[] format expected by validator
        const specFiles = [
            { path: 'spec.md', content: rootSpec },
            ...Object.entries(dirSpecs).map(([path, content]) => ({ path, content }))
        ];
        const anchorMap = validator.buildAnchorMap(specFiles);
        const result = validator.validatePostGeneration(specFiles, anchorMap);
        if (!result.passed) {
            // Build detailed error message with broken link details
            // Show first 10 broken links to avoid overwhelming output
            const maxLinks = 10;
            const linkDetails = result.brokenLinks.slice(0, maxLinks).map(link => `  - ${link.sourceFile}:${link.lineNumber} → ${link.targetAnchor}`).join('\n');
            const remaining = result.brokenLinks.length > maxLinks
                ? `\n  ... and ${result.brokenLinks.length - maxLinks} more`
                : '';
            throw new Error(`Post-validation failed: ${result.brokenLinks.length} broken links\n` +
                `Broken links:\n${linkDetails}${remaining}\n\n` +
                `Suggestion: Verify that all cross-reference targets exist and anchors are correct.`);
        }
    }
    handlePhaseError(phase, error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.status.errors.push({
            phase,
            message: errorMessage,
            details: error
        });
        this.emit('phaseError', phase, error);
        throw error; // Re-throw to halt pipeline
    }
    getKnowledgeBase() {
        return this.kb;
    }
    getStatus() {
        return { ...this.status, statistics: { ...this.status.statistics }, errors: [...this.status.errors] }; // Return deep copy
    }
}
//# sourceMappingURL=orchestrator.js.map