export interface NodesAndAttributes {
  nodes: string[];
  attrs: string[];
}

/**
 * Metadata used for XML transformations
 */
export interface TransformMetadata {
  appPackage?: string;
  [key: string]: any;
}

export interface TransformSourceXmlOptions {
  metadata?: TransformMetadata;
  addIndexPath?: boolean;
}

export interface TransformNodeOptions extends TransformSourceXmlOptions {
  parentPath?: string;
}

/**
 * Type for platform-specific name mappings
 * Values can be a string or an array of strings (for many-to-one mappings)
 */
export type PlatformNameMap = Record<string, string | readonly string[]>;

/**
 * Type for universal name maps
 * Keys are universal names, values are platform-specific mappings
 */
export type UniversalNameMap = Record<string, Partial<PlatformNameMap>>;
