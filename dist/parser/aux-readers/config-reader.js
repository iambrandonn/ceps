export class ConfigReader {
    extractFacts(filePath, content) {
        const factSets = [];
        const facts = [];
        try {
            // Try parsing as JSON
            const config = JSON.parse(content);
            // Extract top-level config keys
            Object.keys(config).forEach((key) => {
                facts.push({
                    subjectId: filePath,
                    predicate: 'config-key',
                    object: key,
                });
            });
            if (facts.length > 0) {
                factSets.push({
                    id: `${filePath}-config-facts`,
                    facts,
                    sources: [{ kind: 'aux', file: filePath, reader: 'config-reader' }],
                    evidenceScore: 80, // High confidence for config files
                });
            }
        }
        catch (error) {
            // Not valid JSON, skip
        }
        return factSets;
    }
}
//# sourceMappingURL=config-reader.js.map