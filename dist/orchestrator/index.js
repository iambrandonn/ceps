#!/usr/bin/env node
import { parseArgs, validateArgs } from './cli.js';
import { Scanner } from '../scanner/scanner.js';
import { Parser } from '../parser/parser.js';
import { KnowledgeBase } from '../kb/knowledge-base.js';
import { SpecGenerator } from '../generator/spec-generator.js';
import * as fs from 'fs';
import * as path from 'path';
const VERSION = '0.2.0';
export async function run(argv) {
    try {
        const args = parseArgs(argv);
        // Handle --version flag
        if (args.version) {
            console.log(`ceps v${VERSION}`);
            return 0;
        }
        validateArgs(args);
        console.log(`ceps v${VERSION} (Phase 2)`);
        console.log(`Project root: ${args.projectRoot}`);
        // Phase 2: Scanner
        console.log('\nScanning files...');
        const scanner = new Scanner(args.projectRoot);
        const fileIndex = await scanner.scan();
        console.log(`Found ${fileIndex.entries.length} files`);
        if (fileIndex.packages.packages.length > 0) {
            console.log(`Detected monorepo with ${fileIndex.packages.packages.length} packages:`);
            for (const pkg of fileIndex.packages.packages) {
                console.log(`  - ${pkg.name} (${pkg.files.length} files)`);
            }
        }
        // File type breakdown
        const byKind = {
            code: fileIndex.entries.filter(e => e.kind === 'code').length,
            test: fileIndex.entries.filter(e => e.kind === 'test').length,
            config: fileIndex.entries.filter(e => e.kind === 'config').length,
            contract: fileIndex.entries.filter(e => e.kind === 'contract').length
        };
        console.log('\nFile breakdown:');
        console.log(`  Code:     ${byKind.code}`);
        console.log(`  Tests:    ${byKind.test}`);
        console.log(`  Config:   ${byKind.config}`);
        console.log(`  Contract: ${byKind.contract}`);
        // Phase 2: Parse files and populate KB
        console.log('\nParsing code files...');
        const kb = new KnowledgeBase();
        const parser = new Parser();
        let parsedCount = 0;
        let errorCount = 0;
        const codeFiles = fileIndex.entries.filter(e => e.kind === 'code');
        for (const entry of codeFiles) {
            try {
                const source = fs.readFileSync(entry.absolutePath, 'utf8');
                await parser.parseAndStore(entry.path, source, kb);
                parsedCount++;
            }
            catch (error) {
                console.error(`  ⚠ Failed to parse ${entry.path}: ${error.message}`);
                errorCount++;
            }
        }
        console.log(`Parsed ${parsedCount} files successfully`);
        if (errorCount > 0) {
            console.log(`  ⚠ ${errorCount} files had parse errors`);
        }
        const exportedEntities = kb.listExported();
        console.log(`Extracted ${exportedEntities.length} exported entities`);
        // Phase 2: Generate specs
        console.log('\nGenerating specifications...');
        const generator = new SpecGenerator(kb, fileIndex);
        // Generate root spec
        const rootSpec = generator.generateRootSpec(args.projectRoot);
        const rootSpecPath = path.join(args.projectRoot, 'spec.md');
        fs.writeFileSync(rootSpecPath, rootSpec, 'utf8');
        console.log(`  ✓ Generated root spec: spec.md`);
        // Generate directory/package specs
        const dirSpecs = generator.generateDirectorySpecs(args.projectRoot);
        let specsWritten = 0;
        for (const [specPath, content] of Object.entries(dirSpecs)) {
            const fullPath = path.join(args.projectRoot, specPath);
            // Ensure directory exists
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(fullPath, content, 'utf8');
            console.log(`  ✓ Generated spec: ${specPath}`);
            specsWritten++;
        }
        console.log(`\n✅ Phase 2 Complete!`);
        console.log(`Generated ${specsWritten + 1} specification files`);
        console.log(`  - 1 root spec (spec.md)`);
        console.log(`  - ${specsWritten} directory/package specs`);
        return 0; // success
    }
    catch (error) {
        console.error('Error:', error.message);
        return 1; // failure
    }
}
// CLI entry point
if (import.meta.url === `file://${process.argv[1]}`) {
    run(process.argv).then((code) => process.exit(code));
}
//# sourceMappingURL=index.js.map