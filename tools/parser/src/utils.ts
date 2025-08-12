import { 
  S3Document, 
  Block, 
  DocumentMetadata, 
  BlockMetadata,
  ValidationResult,
  ValidationError,
  ProgrammingLanguage,
  ComplexityLevel
} from './types';
// Note: Avoiding imports that might cause circular dependencies

/**
 * Create a new S3 document with default values
 */
export function createDocument(
  title: string,
  options: {
    metadata?: Partial<DocumentMetadata>;
    blocks?: Block[];
  } = {}
): S3Document {
  const now = new Date().toISOString().split('T')[0];
  
  return {
    version: '1.0',
    title,
    metadata: {
      created: now,
      modified: now,
      author: 'Unknown',
      description: `Software 3 document: ${title}`,
      tags: [],
      license: 'MIT',
      language: 'en',
      category: 'other',
      ...options.metadata
    },
    blocks: options.blocks || []
  };
}

/**
 * Create a new block with default values
 */
export function createBlock(
  id: string,
  text: string,
  code: string,
  language: ProgrammingLanguage,
  options: {
    metadata?: Partial<BlockMetadata>;
  } = {}
): Block {
  return {
    id,
    text,
    code,
    language,
    metadata: {
      complexity: 'beginner',
      tags: [],
      hidden: false,
      readonly: false,
      executable: false,
      ...options.metadata
    }
  };
}

/**
 * Create a multi-language block
 */
export function createMultiLanguageBlock(
  id: string,
  text: string,
  codeVariants: Record<string, string>,
  options: {
    defaultLanguage?: string;
    metadata?: Partial<BlockMetadata>;
  } = {}
): Block {
  const defaultLanguage = options.defaultLanguage || Object.keys(codeVariants)[0];
  
  return {
    id,
    text,
    code: codeVariants,
    language: 'multi',
    metadata: {
      complexity: 'beginner',
      tags: [],
      hidden: false,
      readonly: false,
      executable: false,
      defaultLanguage,
      ...options.metadata
    }
  };
}

/**
 * Basic validation function for S3 content
 * Note: For full validation, use S3Parser.validate() method
 */
export function validateS3File(content: string): ValidationResult {
  try {
    const document = JSON.parse(content);
    
    const errors: ValidationError[] = [];
    
    // Basic structure checks
    if (!document.version) {
      errors.push({
        message: 'Missing required field: version',
        path: '/version',
        code: 'missing_field'
      });
    }
    
    if (!document.title) {
      errors.push({
        message: 'Missing required field: title',
        path: '/title',
        code: 'missing_field'
      });
    }
    
    if (!Array.isArray(document.blocks)) {
      errors.push({
        message: 'Missing or invalid field: blocks',
        path: '/blocks',
        code: 'missing_field'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  } catch (error) {
    return {
      valid: false,
      errors: [{
        message: error instanceof Error ? error.message : 'Parse error',
        path: '',
        code: 'parse_error'
      }],
      warnings: []
    };
  }
}

/**
 * Convert a simple text document to S3 format
 */
export function textToS3Document(
  title: string,
  text: string,
  options: {
    author?: string;
    language?: ProgrammingLanguage;
    splitByHeadings?: boolean;
  } = {}
): S3Document {
  const document = createDocument(title, {
    metadata: {
      author: options.author || 'Unknown',
      description: `Converted from text: ${title}`
    }
  });

  if (options.splitByHeadings) {
    // Split text by headings and create blocks
    const sections = text.split(/^(#{1,6}\s+.+)$/gm).filter(s => s.trim());
    let currentId = 1;
    
    for (let i = 0; i < sections.length; i += 2) {
      const heading = sections[i]?.trim();
      const content = sections[i + 1]?.trim();
      
      if (heading && content) {
        const block = createBlock(
          `block-${currentId}`,
          `${heading}\n\n${content}`,
          '// No code for this section',
          options.language || 'plaintext'
        );
        document.blocks.push(block);
        currentId++;
      }
    }
    
    // If no blocks were created, create a single block
    if (document.blocks.length === 0) {
      document.blocks.push(createBlock(
        'block-1',
        text,
        '// No code provided',
        options.language || 'plaintext'
      ));
    }
  } else {
    // Create a single block with all text
    document.blocks.push(createBlock(
      'block-1',
      text,
      '// No code provided',
      options.language || 'plaintext'
    ));
  }

  return document;
}

/**
 * Generate a unique block ID within a document
 */
export function generateUniqueBlockId(document: S3Document, baseName: string = 'block'): string {
  const existingIds = new Set(document.blocks.map(b => b.id));
  let counter = 1;
  let candidateId = `${baseName}-${counter}`;
  
  while (existingIds.has(candidateId)) {
    counter++;
    candidateId = `${baseName}-${counter}`;
  }
  
  return candidateId;
}

/**
 * Extract all code from a document by language
 */
export function extractCodeByLanguage(
  document: S3Document,
  language?: ProgrammingLanguage
): Record<string, string[]> {
  const codeByLanguage: Record<string, string[]> = {};
  
  document.blocks.forEach(block => {
    if (block.language === 'multi' && typeof block.code === 'object') {
      Object.entries(block.code).forEach(([lang, code]) => {
        if (!language || lang === language) {
          if (!codeByLanguage[lang]) codeByLanguage[lang] = [];
          codeByLanguage[lang].push(code);
        }
      });
    } else if (typeof block.code === 'string') {
      if (!language || block.language === language) {
        if (!codeByLanguage[block.language]) codeByLanguage[block.language] = [];
        codeByLanguage[block.language].push(block.code);
      }
    }
  });
  
  return codeByLanguage;
}

/**
 * Get all unique tags from a document
 */
export function extractTags(document: S3Document): string[] {
  const allTags = new Set<string>();
  
  // Document-level tags
  if (document.metadata?.tags) {
    document.metadata.tags.forEach(tag => allTags.add(tag));
  }
  
  // Block-level tags
  document.blocks.forEach(block => {
    if (block.metadata?.tags) {
      block.metadata.tags.forEach(tag => allTags.add(tag));
    }
  });
  
  return Array.from(allTags).sort();
}

/**
 * Filter blocks by criteria
 */
export function filterBlocks(
  document: S3Document,
  criteria: {
    tags?: string[];
    languages?: ProgrammingLanguage[];
    complexity?: ComplexityLevel[];
    searchText?: string;
    executable?: boolean;
    hidden?: boolean;
  }
): Block[] {
  return document.blocks.filter(block => {
    // Tag filter
    if (criteria.tags && criteria.tags.length > 0) {
      const blockTags = block.metadata?.tags || [];
      if (!criteria.tags.some(tag => blockTags.includes(tag))) {
        return false;
      }
    }
    
    // Language filter
    if (criteria.languages && criteria.languages.length > 0) {
      if (block.language === 'multi' && typeof block.code === 'object') {
        const blockLanguages = Object.keys(block.code);
        if (!criteria.languages.some(lang => blockLanguages.includes(lang))) {
          return false;
        }
      } else {
        if (!criteria.languages.includes(block.language)) {
          return false;
        }
      }
    }
    
    // Complexity filter
    if (criteria.complexity && criteria.complexity.length > 0) {
      const blockComplexity = block.metadata?.complexity;
      if (!blockComplexity || !criteria.complexity.includes(blockComplexity)) {
        return false;
      }
    }
    
    // Text search filter
    if (criteria.searchText) {
      const searchLower = criteria.searchText.toLowerCase();
      const textMatch = block.text.toLowerCase().includes(searchLower);
      const codeMatch = typeof block.code === 'string'
        ? block.code.toLowerCase().includes(searchLower)
        : Object.values(block.code).some(code => code.toLowerCase().includes(searchLower));
      
      if (!textMatch && !codeMatch) {
        return false;
      }
    }
    
    // Executable filter
    if (criteria.executable !== undefined) {
      if (block.metadata?.executable !== criteria.executable) {
        return false;
      }
    }
    
    // Hidden filter
    if (criteria.hidden !== undefined) {
      if (block.metadata?.hidden !== criteria.hidden) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Estimate reading time for a document
 */
export function estimateReadingTime(document: S3Document): {
  text: number; // minutes for text content
  code: number; // minutes for code content
  total: number; // total minutes
} {
  let textWords = 0;
  let codeLines = 0;
  
  document.blocks.forEach(block => {
    // Count words in text (roughly 5 words per line)
    textWords += block.text.split(/\s+/).length;
    
    // Count lines in code
    if (typeof block.code === 'string') {
      codeLines += block.code.split('\n').length;
    } else {
      codeLines += Object.values(block.code).reduce(
        (total, code) => total + code.split('\n').length, 
        0
      );
    }
  });
  
  // Reading speeds: 200 words/min for text, 50 lines/min for code
  const textTime = Math.ceil(textWords / 200);
  const codeTime = Math.ceil(codeLines / 50);
  
  return {
    text: textTime,
    code: codeTime,
    total: textTime + codeTime
  };
}

/**
 * Clone a document deeply
 */
export function cloneDocument(document: S3Document): S3Document {
  return JSON.parse(JSON.stringify(document));
}

/**
 * Validate block ID format
 */
export function isValidBlockId(id: string): boolean {
  return /^[a-zA-Z0-9-_]+$/.test(id) && id.length >= 1 && id.length <= 100;
}

/**
 * Sanitize block ID to make it valid
 */
export function sanitizeBlockId(id: string): string {
  return id
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100) || 'block';
} 