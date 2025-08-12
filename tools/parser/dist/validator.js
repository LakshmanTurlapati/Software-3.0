"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = void 0;
/**
 * Simplified validator class for .s3 documents
 * In production, this would use AJV with the full JSON schema
 */
class Validator {
    constructor(config) {
        this.config = config;
    }
    /**
     * Validate a .s3 document
     */
    validate(document) {
        const errors = [];
        const warnings = [];
        // Basic structure validation
        this.validateBasicStructure(document, errors);
        // Custom validations
        this.validateBlockIds(document, errors);
        this.validateLanguageConsistency(document, errors, warnings);
        this.validateMetadata(document, warnings);
        // Run custom validators
        this.config.customValidators?.forEach(validator => {
            const customErrors = validator.validate(document);
            errors.push(...customErrors);
        });
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    validateBasicStructure(document, errors) {
        // Check required fields
        if (!document.version) {
            errors.push({
                message: 'Missing required field: version',
                path: '/version',
                code: 'missing_required_field'
            });
        }
        if (!document.title) {
            errors.push({
                message: 'Missing required field: title',
                path: '/title',
                code: 'missing_required_field'
            });
        }
        if (!Array.isArray(document.blocks)) {
            errors.push({
                message: 'Missing or invalid required field: blocks (must be array)',
                path: '/blocks',
                code: 'missing_required_field'
            });
        }
        else if (document.blocks.length === 0) {
            errors.push({
                message: 'Document must contain at least one block',
                path: '/blocks',
                code: 'empty_blocks_array'
            });
        }
        // Validate version format
        if (document.version && !/^1\.(0|[1-9]\d*)$/.test(document.version)) {
            errors.push({
                message: 'Invalid version format. Expected format: 1.x',
                path: '/version',
                code: 'invalid_version_format'
            });
        }
        // Validate title length
        if (document.title && (document.title.length < 1 || document.title.length > 200)) {
            errors.push({
                message: 'Title must be between 1 and 200 characters',
                path: '/title',
                code: 'invalid_title_length'
            });
        }
        // Validate blocks structure
        if (Array.isArray(document.blocks)) {
            document.blocks.forEach((block, index) => {
                this.validateBlock(block, index, errors);
            });
        }
    }
    validateBlock(block, index, errors) {
        const basePath = `/blocks/${index}`;
        // Check required block fields
        if (!block.id) {
            errors.push({
                message: 'Block missing required field: id',
                path: `${basePath}/id`,
                code: 'missing_block_field'
            });
        }
        if (!block.text) {
            errors.push({
                message: 'Block missing required field: text',
                path: `${basePath}/text`,
                code: 'missing_block_field'
            });
        }
        if (!block.code) {
            errors.push({
                message: 'Block missing required field: code',
                path: `${basePath}/code`,
                code: 'missing_block_field'
            });
        }
        if (!block.language) {
            errors.push({
                message: 'Block missing required field: language',
                path: `${basePath}/language`,
                code: 'missing_block_field'
            });
        }
        // Validate block ID format
        if (block.id && (typeof block.id !== 'string' || !/^[a-zA-Z0-9-_]+$/.test(block.id))) {
            errors.push({
                message: 'Block ID must contain only letters, numbers, hyphens, and underscores',
                path: `${basePath}/id`,
                code: 'invalid_block_id_format'
            });
        }
        // Validate language
        const validLanguages = [
            'javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'c',
            'go', 'rust', 'php', 'ruby', 'swift', 'kotlin', 'scala',
            'html', 'css', 'sql', 'bash', 'powershell', 'yaml', 'json',
            'dockerfile', 'terraform', 'nginx', 'apache', 'xml', 'markdown',
            'plaintext', 'multi', 'other'
        ];
        if (block.language && !validLanguages.includes(block.language)) {
            errors.push({
                message: `Invalid language: ${block.language}`,
                path: `${basePath}/language`,
                code: 'invalid_language'
            });
        }
        // Validate text and code types
        if (block.text && typeof block.text !== 'string') {
            errors.push({
                message: 'Block text must be a string',
                path: `${basePath}/text`,
                code: 'invalid_text_type'
            });
        }
        if (block.code) {
            if (block.language === 'multi') {
                if (typeof block.code !== 'object' || Array.isArray(block.code)) {
                    errors.push({
                        message: 'Multi-language blocks must have code as an object',
                        path: `${basePath}/code`,
                        code: 'invalid_multi_language_code'
                    });
                }
            }
            else {
                if (typeof block.code !== 'string') {
                    errors.push({
                        message: 'Single-language blocks must have code as a string',
                        path: `${basePath}/code`,
                        code: 'invalid_single_language_code'
                    });
                }
            }
        }
    }
    validateBlockIds(document, errors) {
        const ids = new Set();
        const duplicates = new Set();
        document.blocks.forEach((block, index) => {
            if (!block.id) {
                errors.push({
                    message: 'Block ID is required',
                    path: `/blocks/${index}/id`,
                    code: 'missing_block_id'
                });
                return;
            }
            if (ids.has(block.id)) {
                duplicates.add(block.id);
            }
            else {
                ids.add(block.id);
            }
        });
        duplicates.forEach(id => {
            errors.push({
                message: `Duplicate block ID: ${id}`,
                path: '/blocks',
                code: 'duplicate_block_id'
            });
        });
    }
    validateLanguageConsistency(document, errors, warnings) {
        document.blocks.forEach((block, index) => {
            if (block.language === 'multi') {
                if (typeof block.code !== 'object') {
                    errors.push({
                        message: 'Multi-language blocks must have code as an object',
                        path: `/blocks/${index}/code`,
                        code: 'invalid_multi_language_code'
                    });
                }
                else {
                    const codeKeys = Object.keys(block.code);
                    if (codeKeys.length === 0) {
                        warnings.push({
                            message: 'Multi-language block has no code variants',
                            path: `/blocks/${index}/code`,
                            code: 'empty_multi_language_code'
                        });
                    }
                    // Check if defaultLanguage is valid
                    const defaultLang = block.metadata?.defaultLanguage;
                    if (defaultLang && !codeKeys.includes(defaultLang)) {
                        warnings.push({
                            message: `Default language "${defaultLang}" not found in code variants`,
                            path: `/blocks/${index}/metadata/defaultLanguage`,
                            code: 'invalid_default_language'
                        });
                    }
                }
            }
            else {
                if (typeof block.code !== 'string') {
                    errors.push({
                        message: 'Single-language blocks must have code as a string',
                        path: `/blocks/${index}/code`,
                        code: 'invalid_single_language_code'
                    });
                }
            }
        });
    }
    validateMetadata(document, warnings) {
        // Check for recommended metadata fields
        if (!document.metadata?.author) {
            warnings.push({
                message: 'Author metadata is recommended',
                path: '/metadata/author',
                code: 'missing_recommended_metadata'
            });
        }
        if (!document.metadata?.description) {
            warnings.push({
                message: 'Description metadata is recommended',
                path: '/metadata/description',
                code: 'missing_recommended_metadata'
            });
        }
        // Validate dates
        if (document.metadata?.created) {
            const created = new Date(document.metadata.created);
            if (isNaN(created.getTime())) {
                warnings.push({
                    message: 'Invalid created date format',
                    path: '/metadata/created',
                    code: 'invalid_date_format'
                });
            }
        }
        if (document.metadata?.modified) {
            const modified = new Date(document.metadata.modified);
            if (isNaN(modified.getTime())) {
                warnings.push({
                    message: 'Invalid modified date format',
                    path: '/metadata/modified',
                    code: 'invalid_date_format'
                });
            }
            // Check if modified is after created
            if (document.metadata?.created) {
                const created = new Date(document.metadata.created);
                if (!isNaN(created.getTime()) && !isNaN(modified.getTime()) && modified < created) {
                    warnings.push({
                        message: 'Modified date should be after created date',
                        path: '/metadata/modified',
                        code: 'invalid_date_order'
                    });
                }
            }
        }
    }
}
exports.Validator = Validator;
//# sourceMappingURL=validator.js.map