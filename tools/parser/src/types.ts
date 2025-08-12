/**
 * TypeScript type definitions for Software 3 (.s3) file format
 */

export interface S3Document {
  version: string;
  title: string;
  metadata?: DocumentMetadata;
  blocks: Block[];
}

export interface DocumentMetadata {
  author?: string;
  created?: string;
  modified?: string;
  description?: string;
  tags?: string[];
  version?: string;
  license?: string;
  language?: string;
  category?: DocumentCategory;
  [key: string]: any; // Allow additional custom fields
}

export type DocumentCategory = 
  | 'tutorial' 
  | 'documentation' 
  | 'specification' 
  | 'example' 
  | 'reference' 
  | 'guide' 
  | 'api' 
  | 'other';

export interface Block {
  id: string;
  text: string;
  code: string | MultiLanguageCode;
  language: ProgrammingLanguage;
  metadata?: BlockMetadata;
}

export interface MultiLanguageCode {
  [language: string]: string;
}

export interface BlockMetadata {
  tags?: string[];
  complexity?: ComplexityLevel;
  executionTime?: string;
  dependencies?: string[];
  outputs?: OutputSpec[];
  hidden?: boolean;
  readonly?: boolean;
  executable?: boolean;
  environment?: ExecutionEnvironment;
  defaultLanguage?: string;
  importType?: ImportType;
  importPath?: string;
  expectedOutput?: ExpectedOutput;
  [key: string]: any; // Allow additional custom fields
}

export type ComplexityLevel = 'beginner' | 'intermediate' | 'advanced';

export type ExecutionEnvironment = 
  | 'nodejs' 
  | 'python' 
  | 'browser' 
  | 'shell' 
  | 'docker' 
  | 'other';

export type ImportType = 'file' | 'url' | 'snippet';

export type ProgrammingLanguage = 
  | 'javascript' | 'typescript' | 'python' | 'java' | 'csharp' | 'cpp' | 'c'
  | 'go' | 'rust' | 'php' | 'ruby' | 'swift' | 'kotlin' | 'scala'
  | 'html' | 'css' | 'sql' | 'bash' | 'powershell' | 'yaml' | 'json'
  | 'dockerfile' | 'terraform' | 'nginx' | 'apache' | 'xml' | 'markdown'
  | 'plaintext' | 'multi' | 'other';

export interface OutputSpec {
  type: OutputType;
  description?: string;
  schema?: any; // JSON Schema object
}

export interface ExpectedOutput {
  type: OutputType;
  schema?: any; // JSON Schema object
  example?: any;
}

export type OutputType = 
  | 'text' 
  | 'json' 
  | 'xml' 
  | 'html' 
  | 'image' 
  | 'binary';

// Rendering options
export interface RenderOptions {
  theme?: 'light' | 'dark' | 'auto';
  syntaxHighlighting?: boolean;
  showLineNumbers?: boolean;
  enableToggle?: boolean;
  defaultView?: 'text' | 'code';
  sanitizeMarkdown?: boolean;
  baseUrl?: string;
  customCss?: string;
}

export interface HtmlRenderOptions extends RenderOptions {
  includeBootstrap?: boolean;
  includePrism?: boolean;
  embedAssets?: boolean;
  wrapInDocument?: boolean;
  title?: string;
}

export interface MarkdownExportOptions {
  includeCodeBlocks?: boolean;
  codeBlockStyle?: 'fenced' | 'indented';
  includeMetadata?: boolean;
  frontMatter?: boolean;
  preserveIds?: boolean;
}

// Validation results
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  message: string;
  path: string;
  code: string;
  line?: number;
  column?: number;
}

export interface ValidationWarning {
  message: string;
  path: string;
  code: string;
  line?: number;
  column?: number;
}

// Parser configuration
export interface ParserConfig {
  strict?: boolean;
  allowUnknownFields?: boolean;
  validateSchema?: boolean;
  maxFileSize?: number; // in bytes
  maxBlocks?: number;
  customValidators?: CustomValidator[];
}

export interface CustomValidator {
  name: string;
  validate: (document: S3Document) => ValidationError[];
}

// Export formats
export type ExportFormat = 'html' | 'markdown' | 'json' | 'pdf' | 'txt';

export interface ExportOptions {
  format: ExportFormat;
  outputPath?: string;
  includeMetadata?: boolean;
  preserveFormatting?: boolean;
  [key: string]: any; // Format-specific options
}

// Statistics and analysis
export interface DocumentStats {
  totalBlocks: number;
  languages: LanguageStats[];
  complexityDistribution: ComplexityStats;
  totalLines: {
    text: number;
    code: number;
    total: number;
  };
  estimatedReadingTime: number; // in minutes
  tags: TagStats[];
}

export interface LanguageStats {
  language: ProgrammingLanguage;
  blockCount: number;
  lineCount: number;
  percentage: number;
}

export interface ComplexityStats {
  beginner: number;
  intermediate: number;
  advanced: number;
  unspecified: number;
}

export interface TagStats {
  tag: string;
  count: number;
  blocks: string[]; // block IDs
}

// Events for streaming parser
export interface ParseEvents {
  'document-start': (metadata: DocumentMetadata) => void;
  'document-end': (stats: DocumentStats) => void;
  'block-start': (block: Block) => void;
  'block-end': (blockId: string) => void;
  'error': (error: ValidationError) => void;
  'warning': (warning: ValidationWarning) => void;
} 