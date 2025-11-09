import { SyntaxKind, Node } from 'ts-morph';
import { generateAnchor } from '../kb/id-generation.js';
export class FactExtractor {
    existingAnchors = new Set();
    options;
    constructor(options = {}) {
        this.options = {
            moduleScopeCalls: options.moduleScopeCalls ?? true, // Enabled by default
        };
    }
    extract(sourceFile, filePath) {
        const entities = [];
        const relations = [];
        const factSets = [];
        // Extract functions
        sourceFile.getFunctions().forEach((func) => {
            const name = func.getName() || '<anonymous>';
            const isExported = func.isExported();
            // Build signature from parameters and return type
            const params = func.getParameters().map(p => p.getText()).join(', ');
            const returnType = func.getReturnType().getText();
            const signature = `(${params}): ${returnType}`;
            // v1.3 FIX: Use function body content for anchor, NOT filePath
            const content = func.getText();
            const entityId = generateAnchor(name, content, this.existingAnchors);
            this.existingAnchors.add(entityId);
            const entity = {
                id: entityId,
                kind: 'function',
                name,
                path: filePath,
                signature,
                exported: isExported,
                visibility: isExported ? 'public' : 'internal',
                attributes: {
                    sideEffects: this.detectSideEffects(func),
                    errors: this.detectErrors(func),
                },
            };
            entities.push(entity);
            // Create factSet
            const facts = [
                { subjectId: entityId, predicate: 'is-function', object: true },
                { subjectId: entityId, predicate: 'has-signature', object: signature },
            ];
            const jsdoc = func.getJsDocs();
            if (jsdoc.length > 0) {
                facts.push({
                    subjectId: entityId,
                    predicate: 'has-jsdoc',
                    object: jsdoc[0].getDescription(),
                });
            }
            // Phase 3 Step 3: Extract parameter metadata
            const parameters = func.getParameters();
            facts.push({
                subjectId: entityId,
                predicate: 'param-count',
                object: parameters.length,
            });
            if (parameters.length > 0) {
                const paramNames = parameters.map(p => p.getName()).join(',');
                facts.push({
                    subjectId: entityId,
                    predicate: 'param-names',
                    object: paramNames,
                });
            }
            // Phase 3 Step 3: Detect JSX returns (React components)
            const returnsJSX = this.detectJSXReturn(func);
            if (returnsJSX) {
                facts.push({
                    subjectId: entityId,
                    predicate: 'returns-jsx',
                    object: true,
                });
            }
            // Phase 6 I2: Detect async functions
            const isAsync = func.isAsync();
            if (isAsync) {
                facts.push({
                    subjectId: entityId,
                    predicate: 'is-async',
                    object: 'true',
                });
            }
            // Phase 6 I2: Detect Promise return type
            const funcReturnType = func.getReturnType();
            const returnTypeText = funcReturnType.getText();
            if (returnTypeText.includes('Promise<') || returnTypeText === 'Promise') {
                facts.push({
                    subjectId: entityId,
                    predicate: 'returns-promise',
                    object: 'true',
                });
            }
            factSets.push({
                id: `${entityId}-facts`,
                facts,
                sources: [{ kind: 'ast', file: filePath }],
                evidenceScore: 90, // High confidence for direct AST extraction
            });
            // v1.3 FIX: Extract call relations INSIDE function loop to reuse entityId
            // This avoids creating duplicate anchors for the same function
            // Phase 3 Step 3: Also extract call expression details as facts
            func.forEachDescendant((node) => {
                if (node.getKind() === SyntaxKind.CallExpression) {
                    const callExpr = node;
                    const calleeExpr = callExpr.getExpression().getText();
                    // Create call relation (this function → callee)
                    relations.push({
                        subjectId: entityId, // Use existing entity ID (not a new anchor)
                        predicate: 'calls',
                        objectId: calleeExpr, // Simplified; Phase 3 will resolve to entity IDs
                        source: { kind: 'ast', file: filePath },
                    });
                    // Phase 3 Step 3: Extract structured call facts for pattern detection
                    facts.push({
                        subjectId: entityId,
                        predicate: 'calls-expression',
                        object: calleeExpr,
                    });
                    // Extract literal arguments (strings, numbers)
                    const args = callExpr.getArguments();
                    args.forEach((arg, index) => {
                        if (Node.isStringLiteral(arg) || Node.isNumericLiteral(arg)) {
                            facts.push({
                                subjectId: entityId,
                                predicate: `call-arg-${index}`,
                                object: arg.getText().replace(/['"]/g, ''), // Remove quotes
                            });
                        }
                    });
                }
            });
        });
        // Extract classes
        sourceFile.getClasses().forEach((cls) => {
            const name = cls.getName() || '<anonymous>';
            const isExported = cls.isExported();
            // v1.3 FIX: Use content-based anchoring (consistent with functions)
            const content = cls.getText();
            const entityId = generateAnchor(name, content, this.existingAnchors);
            this.existingAnchors.add(entityId);
            entities.push({
                id: entityId,
                kind: 'class',
                name,
                path: filePath,
                exported: isExported,
                visibility: isExported ? 'public' : 'internal',
            });
            // Create factSet for class (ensures reasoning + coverage have data)
            const classFacts = [
                { subjectId: entityId, predicate: 'is-class', object: true },
            ];
            const classJsdoc = cls.getJsDocs();
            if (classJsdoc.length > 0) {
                classFacts.push({
                    subjectId: entityId,
                    predicate: 'has-jsdoc',
                    object: classJsdoc[0].getDescription(),
                });
            }
            factSets.push({
                id: `${entityId}-facts`,
                facts: classFacts,
                sources: [{ kind: 'ast', file: filePath }],
                evidenceScore: 75,
            });
            // Extract methods (skip private methods - they shouldn't be in public API)
            cls.getMethods().forEach((method) => {
                // Skip private methods - they're implementation details, not public API
                if (method.hasModifier(SyntaxKind.PrivateKeyword)) {
                    return;
                }
                const methodName = method.getName();
                // v1.3 FIX: Use content-based anchoring (consistent with functions)
                const methodContent = method.getText();
                const methodId = generateAnchor(`${name}.${methodName}`, methodContent, this.existingAnchors);
                this.existingAnchors.add(methodId);
                // Build signature from parameters and return type
                const params = method.getParameters().map(p => p.getText()).join(', ');
                const returnType = method.getReturnType().getText();
                const methodSignature = `(${params}): ${returnType}`;
                entities.push({
                    id: methodId,
                    kind: 'method',
                    name: methodName,
                    path: filePath,
                    signature: methodSignature,
                    exported: isExported, // Methods inherit class visibility
                    visibility: isExported ? 'public' : 'internal',
                    attributes: {
                        sideEffects: this.detectSideEffects(method),
                        errors: this.detectErrors(method),
                    },
                });
                // Phase 3 Step 3: Create factSet for method with parameter metadata
                const methodFacts = [
                    { subjectId: methodId, predicate: 'is-method', object: true },
                    { subjectId: methodId, predicate: 'has-signature', object: methodSignature },
                ];
                const methodParams = method.getParameters();
                methodFacts.push({
                    subjectId: methodId,
                    predicate: 'param-count',
                    object: methodParams.length,
                });
                if (methodParams.length > 0) {
                    const paramNames = methodParams.map(p => p.getName()).join(',');
                    methodFacts.push({
                        subjectId: methodId,
                        predicate: 'param-names',
                        object: paramNames,
                    });
                }
                const returnsJSX = this.detectJSXReturn(method);
                if (returnsJSX) {
                    methodFacts.push({
                        subjectId: methodId,
                        predicate: 'returns-jsx',
                        object: true,
                    });
                }
                // v1.3 FIX: Extract call relations for methods (similar to functions)
                // Phase 3 Step 3: Also extract call expression details as facts
                method.forEachDescendant((node) => {
                    if (node.getKind() === SyntaxKind.CallExpression) {
                        const callExpr = node;
                        const calleeExpr = callExpr.getExpression().getText();
                        // Create call relation (this method → callee)
                        relations.push({
                            subjectId: methodId, // Use existing method ID (not a new anchor)
                            predicate: 'calls',
                            objectId: calleeExpr, // Simplified; Phase 3 will resolve to entity IDs
                            source: { kind: 'ast', file: filePath },
                        });
                        // Phase 3 Step 3: Extract structured call facts for pattern detection
                        methodFacts.push({
                            subjectId: methodId,
                            predicate: 'calls-expression',
                            object: calleeExpr,
                        });
                        // Extract literal arguments
                        const args = callExpr.getArguments();
                        args.forEach((arg, index) => {
                            if (Node.isStringLiteral(arg) || Node.isNumericLiteral(arg)) {
                                methodFacts.push({
                                    subjectId: methodId,
                                    predicate: `call-arg-${index}`,
                                    object: arg.getText().replace(/['"]/g, ''),
                                });
                            }
                        });
                    }
                });
                // Add method factSet
                factSets.push({
                    id: `${methodId}-facts`,
                    facts: methodFacts,
                    sources: [{ kind: 'ast', file: filePath }],
                    evidenceScore: 90,
                });
            });
        });
        // Extract imports
        sourceFile.getImportDeclarations().forEach((imp) => {
            const moduleSpecifier = imp.getModuleSpecifierValue();
            relations.push({
                subjectId: filePath,
                predicate: 'imports',
                objectId: moduleSpecifier,
                source: { kind: 'ast', file: filePath },
            });
        });
        // Extract exports
        sourceFile.getExportDeclarations().forEach((exp) => {
            const moduleSpecifier = exp.getModuleSpecifierValue();
            if (moduleSpecifier) {
                relations.push({
                    subjectId: filePath,
                    predicate: 'exports',
                    objectId: moduleSpecifier,
                    source: { kind: 'ast', file: filePath },
                });
            }
        });
        // Extract variable declarations (constants, let, var)
        sourceFile.getVariableDeclarations().forEach((varDecl) => {
            const name = varDecl.getName();
            const parent = varDecl.getParent();
            const grandparent = parent?.getParent();
            // Check if exported at statement level
            const isExported = grandparent?.getKind() === SyntaxKind.VariableStatement &&
                grandparent.isExported?.() === true;
            const content = varDecl.getText();
            const entityId = generateAnchor(name, content, this.existingAnchors);
            this.existingAnchors.add(entityId);
            entities.push({
                id: entityId,
                kind: 'constant',
                name,
                path: filePath,
                exported: isExported,
                visibility: isExported ? 'public' : 'internal',
            });
            const facts = [
                { subjectId: entityId, predicate: 'is-constant', object: true },
            ];
            const initializer = varDecl.getInitializer();
            if (initializer) {
                const initializerText = initializer.getText().trim();
                if (initializerText.length > 0) {
                    facts.push({
                        subjectId: entityId,
                        predicate: 'initializer',
                        object: initializerText,
                    });
                }
                if (Node.isCallExpression(initializer)) {
                    facts.push({
                        subjectId: entityId,
                        predicate: 'initializer-call',
                        object: initializer.getExpression().getText(),
                    });
                }
            }
            factSets.push({
                id: `${entityId}-facts`,
                facts,
                sources: [{ kind: 'ast', file: filePath }],
                evidenceScore: 60,
            });
        });
        // Phase 6 Fix: Extract module-scope call expressions
        // Can be disabled via --no-module-scope-calls flag or CEPS_MODULE_SCOPE_CALLS=false env var
        if (this.options.moduleScopeCalls) {
            // Build a map of constant names to their entities for quick lookup
            // Phase 6 Fix (Issue #3): Design Decision - Pseudo-Entity Reuse
            // This map is intentionally shared across all statements (not reset per statement).
            // When a pseudo-entity is created for an object (e.g., 'app'), subsequent statements
            // using the same object will reuse that entity. This differs from the original plan
            // which specified "one pseudo-entity per statement", but this approach is better for
            // documentation because it groups all operations on the same object together.
            // Example: All app.use(), app.get(), app.post() calls will attach to the same
            // pseudo-entity representing 'app', making the generated behavior chunk more cohesive.
            const constantsByName = new Map();
            entities.filter(e => e.kind === 'constant').forEach(e => {
                constantsByName.set(e.name, e);
            });
            // Traverse module-level statements to extract calls on constants
            sourceFile.getStatements().forEach((statement) => {
                // Skip function/class declarations (already processed above)
                if (Node.isFunctionDeclaration(statement) ||
                    Node.isClassDeclaration(statement) ||
                    Node.isImportDeclaration(statement) ||
                    Node.isExportDeclaration(statement)) {
                    return;
                }
                // Look for call expressions in this statement
                statement.forEachDescendant((node) => {
                    if (Node.isCallExpression(node)) {
                        const callExpr = node;
                        const expression = callExpr.getExpression();
                        // Check if this is a property access call (e.g., router.post(...))
                        if (Node.isPropertyAccessExpression(expression)) {
                            const objectExpr = expression.getExpression();
                            // Phase 6 Fix (Issue #4): Skip chained calls to avoid spurious pseudo-entities
                            // For chained calls like router.route('/x').get(handler), the object expression
                            // of .get() is the CallExpression router.route('/x'). This is already handled
                            // by the first call + chained-call logic below, so skip creating a pseudo-entity.
                            if (Node.isCallExpression(objectExpr)) {
                                return; // Skip - this will be handled as a chained call
                            }
                            const objectName = objectExpr.getText();
                            const methodName = expression.getName();
                            // Find the constant entity this call belongs to
                            let ownerEntity = constantsByName.get(objectName);
                            // If not found in constants, create a synthetic pseudo-entity
                            if (!ownerEntity) {
                                const startLine = statement.getStartLineNumber();
                                const relPath = filePath.replace(/\\/g, '/');
                                const syntheticName = `module::${relPath}#L${startLine}`;
                                // Generate anchor for pseudo-entity
                                const syntheticContent = statement.getText();
                                const entityId = generateAnchor(syntheticName, syntheticContent, this.existingAnchors);
                                this.existingAnchors.add(entityId);
                                ownerEntity = {
                                    id: entityId,
                                    kind: 'constant',
                                    name: syntheticName,
                                    path: filePath,
                                    exported: false,
                                    visibility: 'internal',
                                    metadata: {
                                        synthetic: true,
                                        scope: 'module',
                                        objectName: objectName // Phase 6 Fix (Issue #2): Store object name for pattern matching
                                    },
                                };
                                entities.push(ownerEntity);
                                // Create factSet for synthetic entity
                                const syntheticFactSet = {
                                    id: `${entityId}-facts`,
                                    facts: [
                                        { subjectId: entityId, predicate: 'is-constant', object: true },
                                    ],
                                    sources: [{ kind: 'ast', file: filePath }],
                                    evidenceScore: 50, // Lower score for synthetic entities
                                };
                                factSets.push(syntheticFactSet);
                                // Add to map for potential future calls in same statement
                                constantsByName.set(objectName, ownerEntity);
                            }
                            // TypeScript guard: ownerEntity should always be defined at this point
                            if (!ownerEntity) {
                                return; // Should never happen, but satisfies TypeScript
                            }
                            // Find this entity's factSet
                            const ownerFactSet = factSets.find(fs => fs.id === `${ownerEntity.id}-facts`);
                            if (ownerFactSet) {
                                // Add call expression fact
                                ownerFactSet.facts.push({
                                    subjectId: ownerEntity.id,
                                    predicate: 'calls-expression',
                                    object: `${objectName}.${methodName}`,
                                });
                                // Add call-scope metadata
                                ownerFactSet.facts.push({
                                    subjectId: ownerEntity.id,
                                    predicate: 'call-scope',
                                    object: 'scope:module',
                                });
                                // Extract call arguments
                                const args = callExpr.getArguments();
                                args.forEach((arg, index) => {
                                    if (Node.isStringLiteral(arg) || Node.isNumericLiteral(arg)) {
                                        ownerFactSet.facts.push({
                                            subjectId: ownerEntity.id,
                                            predicate: `call-arg-${index}`,
                                            object: arg.getText().replace(/['"]/g, ''),
                                        });
                                    }
                                    else if (Node.isIdentifier(arg)) {
                                        // For identifiers (e.g., middleware, handler), store the name
                                        ownerFactSet.facts.push({
                                            subjectId: ownerEntity.id,
                                            predicate: `call-arg-${index}`,
                                            object: arg.getText(),
                                        });
                                    }
                                    else if (Node.isCallExpression(arg)) {
                                        // Phase 6 Fix (Issue #1): Handle wrapper/middleware CallExpressions
                                        // e.g., allowedRoles('ADMIN'), wrapAsync(handler)
                                        const callArgExpr = arg;
                                        const wrapperExpr = callArgExpr.getExpression();
                                        const wrapperName = wrapperExpr.getText();
                                        // Store the wrapper call name
                                        ownerFactSet.facts.push({
                                            subjectId: ownerEntity.id,
                                            predicate: `call-arg-${index}`,
                                            object: wrapperName,
                                        });
                                        // Extract the wrapped function/arguments
                                        const wrapperArgs = callArgExpr.getArguments();
                                        wrapperArgs.forEach((wArg, wIndex) => {
                                            if (Node.isStringLiteral(wArg) || Node.isNumericLiteral(wArg)) {
                                                ownerFactSet.facts.push({
                                                    subjectId: ownerEntity.id,
                                                    predicate: `call-arg-${index}-wrapped-${wIndex}`,
                                                    object: wArg.getText().replace(/['"]/g, ''),
                                                });
                                            }
                                            else if (Node.isIdentifier(wArg)) {
                                                ownerFactSet.facts.push({
                                                    subjectId: ownerEntity.id,
                                                    predicate: `call-arg-${index}-wrapped-${wIndex}`,
                                                    object: wArg.getText(),
                                                });
                                            }
                                            else if (Node.isArrayLiteralExpression(wArg)) {
                                                // For array literals (e.g., ['ADMIN', 'USER']), store the full array text
                                                ownerFactSet.facts.push({
                                                    subjectId: ownerEntity.id,
                                                    predicate: `call-arg-${index}-wrapped-${wIndex}`,
                                                    object: wArg.getText(),
                                                });
                                            }
                                            // Note: Deeply nested CallExpressions not handled yet (can add recursion if needed)
                                        });
                                    }
                                });
                                // Create call relation
                                relations.push({
                                    subjectId: ownerEntity.id,
                                    predicate: 'calls',
                                    objectId: `${objectName}.${methodName}`,
                                    source: { kind: 'ast', file: filePath },
                                });
                                // Phase 6: Handle chained calls (e.g., router.route('/x').get(handler))
                                // Check if the parent of this call is also a call expression (chained)
                                let chainedParent = callExpr.getParent();
                                while (chainedParent) {
                                    // Check if parent is a property access that's part of a call
                                    if (Node.isPropertyAccessExpression(chainedParent)) {
                                        const parentCallCheck = chainedParent.getParent();
                                        if (Node.isCallExpression(parentCallCheck)) {
                                            const chainedCallExpr = parentCallCheck;
                                            const chainedMethodName = chainedParent.getName();
                                            // Add chained-call fact
                                            ownerFactSet.facts.push({
                                                subjectId: ownerEntity.id,
                                                predicate: 'chained-call',
                                                object: chainedMethodName,
                                            });
                                            // Extract chained call arguments
                                            const chainedArgs = chainedCallExpr.getArguments();
                                            chainedArgs.forEach((arg, index) => {
                                                if (Node.isStringLiteral(arg) || Node.isNumericLiteral(arg)) {
                                                    ownerFactSet.facts.push({
                                                        subjectId: ownerEntity.id,
                                                        predicate: `chained-call-arg-${index}`,
                                                        object: arg.getText().replace(/['"]/g, ''),
                                                    });
                                                }
                                                else if (Node.isIdentifier(arg)) {
                                                    ownerFactSet.facts.push({
                                                        subjectId: ownerEntity.id,
                                                        predicate: `chained-call-arg-${index}`,
                                                        object: arg.getText(),
                                                    });
                                                }
                                            });
                                            // Move up the chain
                                            chainedParent = chainedCallExpr.getParent();
                                        }
                                        else {
                                            break;
                                        }
                                    }
                                    else {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                });
            });
        }
        // Process default exports (export default X)
        // Inline exports (e.g., "export default function foo() {}") are already
        // handled by isExported() checks during entity extraction.
        sourceFile.getExportAssignments().forEach((assignment) => {
            if (!assignment.isExportEquals()) {
                const expr = assignment.getExpression();
                // Only handle identifier exports (e.g., "export default router")
                // Inline exports (e.g., "export default function foo() {}")
                // are already handled by isExported() checks
                if (Node.isIdentifier(expr)) {
                    const exportedName = expr.getText();
                    // Find the entity in already-extracted entities
                    const entity = entities.find((e) => e.name === exportedName);
                    if (entity) {
                        // Mark as exported
                        entity.exported = true;
                        entity.visibility = 'public';
                        // Add a fact indicating this is the default export
                        // Naming convention verified: follows existing boolean patterns
                        // (is-function, is-class, is-method, is-constant, is-async)
                        const entityFactSet = factSets.find((fs) => fs.id === `${entity.id}-facts`);
                        if (entityFactSet) {
                            entityFactSet.facts.push({
                                subjectId: entity.id,
                                predicate: 'is-default-export',
                                object: true,
                            });
                        }
                    }
                }
            }
        });
        // Also process named exports (export { foo, bar })
        sourceFile.getExportDeclarations().forEach((exportDecl) => {
            // Skip re-exports (export { foo } from './bar')
            // These create relations but don't mark entities as exported
            if (exportDecl.getModuleSpecifier()) {
                return;
            }
            // Process local named exports (export { foo, bar })
            exportDecl.getNamedExports().forEach((namedExport) => {
                const name = namedExport.getName();
                const entity = entities.find((e) => e.name === name);
                if (entity) {
                    entity.exported = true;
                    entity.visibility = 'public';
                }
            });
        });
        return { entities, relations, factSets };
    }
    detectSideEffects(node) {
        const sideEffects = [];
        const text = node.getText();
        // Network calls
        if (text.includes('fetch(') ||
            text.includes('axios.') ||
            text.includes('http.')) {
            sideEffects.push('network');
        }
        // Storage
        if (text.includes('localStorage') || text.includes('sessionStorage')) {
            sideEffects.push('storage');
        }
        // File I/O
        if (text.includes('fs.') ||
            text.includes('readFile') ||
            text.includes('writeFile')) {
            sideEffects.push('filesystem');
        }
        // Database
        if (text.includes('prisma.') ||
            text.includes('.query(') ||
            text.includes('.execute(')) {
            sideEffects.push('database');
        }
        return sideEffects;
    }
    detectErrors(node) {
        const errors = [];
        node.forEachDescendant((descendant) => {
            if (descendant.getKind() === SyntaxKind.ThrowStatement) {
                const throwText = descendant.getText();
                errors.push(throwText.replace('throw ', '').trim());
            }
        });
        return errors;
    }
    /**
     * Phase 3 Step 3: Detect if a function returns JSX (React component).
     * Checks for:
     * - JSX.Element or ReactElement in return type
     * - JSX elements or self-closing elements in body
     */
    detectJSXReturn(node) {
        // Check return type annotation
        if (Node.isFunctionDeclaration(node) || Node.isArrowFunction(node)) {
            const returnType = node.getReturnType().getText();
            if (returnType.includes('JSX.Element') || returnType.includes('ReactElement')) {
                return true;
            }
            // Check for JSX elements in body
            const hasJSXElement = node.getDescendantsOfKind(SyntaxKind.JsxElement).length > 0;
            const hasJSXSelfClosing = node.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement).length > 0;
            return hasJSXElement || hasJSXSelfClosing;
        }
        return false;
    }
}
//# sourceMappingURL=fact-extractor.js.map