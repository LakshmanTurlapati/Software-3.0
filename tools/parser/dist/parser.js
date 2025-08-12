"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3Parser = void 0;
const validator_1 = require("./validator");
/**
 * Main parser class for Software 3 (.s3) documents
 */
class S3Parser {
    constructor(config = {}) {
        this.config = {
            strict: config.strict ?? true,
            allowUnknownFields: config.allowUnknownFields ?? false,
            validateSchema: config.validateSchema ?? true,
            maxFileSize: config.maxFileSize ?? 10 * 1024 * 1024, // 10MB
            maxBlocks: config.maxBlocks ?? 1000,
            customValidators: config.customValidators ?? []
        };
        this.validator = new validator_1.Validator(this.config);
    }
    /**
     * Parse a .s3 file content from string
     */
    parse(content) {
        // Check file size
        if (content.length > this.config.maxFileSize) {
            throw new Error(`File size exceeds maximum allowed size of ${this.config.maxFileSize} bytes`);
        }
        let document;
        try {
            // Parse JSON
            const parsed = JSON.parse(content);
            document = this.normalizeDocument(parsed);
        }
        catch (error) {
            throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        // Validate if enabled
        if (this.config.validateSchema) {
            const validation = this.validate(document);
            if (!validation.valid && this.config.strict) {
                throw new Error(`Validation failed: ${validation.errors[0]?.message || 'Unknown error'}`);
            }
        }
        // Check block limits
        if (document.blocks.length > this.config.maxBlocks) {
            throw new Error(`Document exceeds maximum allowed blocks (${this.config.maxBlocks})`);
        }
        return document;
    }
    /**
     * Parse .s3 file from file system (Node.js only)
     * Note: This method will only work in Node.js environments
     */
    async parseFile(filePath) {
        throw new Error('parseFile is only available in Node.js environments. Use parse() with file content instead.');
    }
    /**
     * Validate a .s3 document
     */
    validate(document) {
        return this.validator.validate(document);
    }
    /**
     * Generate a new .s3 document
     */
    create(title, blocks = []) {
        const document = {
            version: '1.0',
            title,
            metadata: {
                created: new Date().toISOString().split('T')[0],
                author: 'Unknown',
                description: `Software 3 document: ${title}`,
                tags: [],
                license: 'MIT',
                language: 'en',
                category: 'other'
            },
            blocks
        };
        // Ensure unique block IDs
        this.ensureUniqueBlockIds(document);
        return document;
    }
    /**
     * Add a block to a document
     */
    addBlock(document, block) {
        // Ensure unique ID
        if (document.blocks.some(b => b.id === block.id)) {
            block.id = this.generateUniqueBlockId(document, block.id);
        }
        document.blocks.push(block);
        // Update metadata
        if (document.metadata) {
            document.metadata.modified = new Date().toISOString().split('T')[0];
        }
    }
    /**
     * Remove a block from a document
     */
    removeBlock(document, blockId) {
        const index = document.blocks.findIndex(block => block.id === blockId);
        if (index === -1) {
            return false;
        }
        document.blocks.splice(index, 1);
        // Update metadata
        if (document.metadata) {
            document.metadata.modified = new Date().toISOString().split('T')[0];
        }
        return true;
    }
    /**
     * Update a block in a document
     */
    updateBlock(document, blockId, updates) {
        const block = document.blocks.find(b => b.id === blockId);
        if (!block) {
            return false;
        }
        // Apply updates (preserve ID)
        Object.assign(block, { ...updates, id: blockId });
        // Update metadata
        if (document.metadata) {
            document.metadata.modified = new Date().toISOString().split('T')[0];
        }
        return true;
    }
    /**
     * Reorder blocks in a document
     */
    reorderBlocks(document, blockOrder) {
        const reorderedBlocks = [];
        // Add blocks in specified order
        blockOrder.forEach(blockId => {
            const block = document.blocks.find(b => b.id === blockId);
            if (block) {
                reorderedBlocks.push(block);
            }
        });
        // Add any remaining blocks not in the order
        document.blocks.forEach(block => {
            if (!blockOrder.includes(block.id)) {
                reorderedBlocks.push(block);
            }
        });
        document.blocks = reorderedBlocks;
        // Update metadata
        if (document.metadata) {
            document.metadata.modified = new Date().toISOString().split('T')[0];
        }
    }
    /**
     * Generate document statistics
     */
    generateStats(document) {
        const languages = new Map();
        const complexities = { beginner: 0, intermediate: 0, advanced: 0, unspecified: 0 };
        const tags = new Map();
        let totalTextLines = 0;
        let totalCodeLines = 0;
        document.blocks.forEach(block => {
            // Count lines
            const textLines = block.text.split('\n').length;
            const codeLines = typeof block.code === 'string'
                ? block.code.split('\n').length
                : Object.values(block.code).reduce((sum, code) => sum + code.split('\n').length, 0);
            totalTextLines += textLines;
            totalCodeLines += codeLines;
            // Language statistics
            if (block.language === 'multi' && typeof block.code === 'object') {
                Object.keys(block.code).forEach(lang => {
                    const langData = languages.get(lang) || { count: 0, lines: 0 };
                    langData.count += 1;
                    const codeObj = block.code;
                    langData.lines += codeObj[lang].split('\n').length;
                    languages.set(lang, langData);
                });
            }
            else if (block.language !== 'multi') {
                const langData = languages.get(block.language) || { count: 0, lines: 0 };
                langData.count += 1;
                langData.lines += codeLines;
                languages.set(block.language, langData);
            }
            // Complexity statistics
            const complexity = block.metadata?.complexity || 'unspecified';
            if (complexity in complexities) {
                complexities[complexity]++;
            }
            else {
                complexities.unspecified++;
            }
            // Tag statistics
            const blockTags = [
                ...(document.metadata?.tags || []),
                ...(block.metadata?.tags || [])
            ];
            blockTags.forEach(tag => {
                const tagData = tags.get(tag) || { count: 0, blocks: [] };
                tagData.count++;
                if (!tagData.blocks.includes(block.id)) {
                    tagData.blocks.push(block.id);
                }
                tags.set(tag, tagData);
            });
        });
        const totalLines = totalTextLines + totalCodeLines;
        const languageStats = Array.from(languages.entries()).map(([lang, data]) => ({
            language: lang,
            blockCount: data.count,
            lineCount: data.lines,
            percentage: totalCodeLines > 0 ? (data.lines / totalCodeLines) * 100 : 0
        }));
        const tagStats = Array.from(tags.entries()).map(([tag, data]) => ({
            tag,
            count: data.count,
            blocks: data.blocks
        }));
        // Estimate reading time (average 200 words per minute, ~5 words per line)
        const estimatedReadingTime = Math.ceil((totalTextLines * 5) / 200);
        return {
            totalBlocks: document.blocks.length,
            languages: languageStats,
            complexityDistribution: complexities,
            totalLines: {
                text: totalTextLines,
                code: totalCodeLines,
                total: totalLines
            },
            estimatedReadingTime,
            tags: tagStats
        };
    }
    /**
     * Serialize document back to JSON string
     */
    stringify(document, indent = 2) {
        return JSON.stringify(document, null, indent);
    }
    /**
     * Clone a document
     */
    clone(document) {
        return JSON.parse(JSON.stringify(document));
    }
    /**
     * Merge two documents
     */
    merge(doc1, doc2, title) {
        const merged = this.clone(doc1);
        // Update title
        merged.title = title || `${doc1.title} + ${doc2.title}`;
        // Merge metadata
        if (doc2.metadata) {
            merged.metadata = { ...merged.metadata, ...doc2.metadata };
            if (merged.metadata) {
                merged.metadata.modified = new Date().toISOString().split('T')[0];
            }
        }
        // Add blocks from doc2 with unique IDs
        doc2.blocks.forEach(block => {
            const clonedBlock = { ...block };
            if (merged.blocks.some(b => b.id === clonedBlock.id)) {
                clonedBlock.id = this.generateUniqueBlockId(merged, clonedBlock.id);
            }
            merged.blocks.push(clonedBlock);
        });
        return merged;
    }
    /**
     * Extract blocks by criteria
     */
    extractBlocks(document, criteria) {
        return document.blocks.filter(block => {
            if (criteria.ids && !criteria.ids.includes(block.id)) {
                return false;
            }
            if (criteria.languages && !criteria.languages.includes(block.language)) {
                return false;
            }
            if (criteria.complexity && block.metadata?.complexity &&
                !criteria.complexity.includes(block.metadata.complexity)) {
                return false;
            }
            if (criteria.tags && criteria.tags.length > 0) {
                const blockTags = block.metadata?.tags || [];
                if (!criteria.tags.some(tag => blockTags.includes(tag))) {
                    return false;
                }
            }
            return true;
        });
    }
    // Private helper methods
    normalizeDocument(parsed) {
        // Ensure required fields exist
        if (!parsed.version || !parsed.title || !Array.isArray(parsed.blocks)) {
            throw new Error('Invalid document structure: missing required fields');
        }
        const document = {
            version: parsed.version,
            title: parsed.title,
            metadata: parsed.metadata || {},
            blocks: parsed.blocks
        };
        // Ensure unique block IDs
        this.ensureUniqueBlockIds(document);
        return document;
    }
    ensureUniqueBlockIds(document) {
        const usedIds = new Set();
        document.blocks.forEach((block, index) => {
            if (!block.id || usedIds.has(block.id)) {
                block.id = this.generateUniqueBlockId(document, block.id || `block-${index + 1}`);
            }
            usedIds.add(block.id);
        });
    }
    generateUniqueBlockId(document, baseId) {
        const usedIds = new Set(document.blocks.map(b => b.id));
        let counter = 1;
        let candidateId = baseId;
        while (usedIds.has(candidateId)) {
            candidateId = `${baseId}-${counter}`;
            counter++;
        }
        return candidateId;
    }
}
exports.S3Parser = S3Parser;
//# sourceMappingURL=parser.js.map