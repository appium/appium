export interface NodesAndAttributes {
  nodes: string[];
  attrs: string[];
}

export interface TransformSourceXmlOptions {
  metadata?: Record<string, any>;
  addIndexPath?: boolean;
}

export interface TransformNodeOptions extends TransformSourceXmlOptions {
  parentPath?: string;
}
