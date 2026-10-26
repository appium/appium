import {util} from '@appium/support';
import {XMLBuilder, XMLParser} from 'fast-xml-parser';

import {ATTR_MAP, REMOVE_ATTRS} from './attr-map.js';
import NODE_MAP from './node-map.js';
import {TRANSFORMS} from './transformers.js';
import type {
  NodesAndAttributes,
  TransformMetadata,
  TransformNodeOptions,
  TransformSourceXmlOptions,
  UniversalNameMap,
} from './types.js';

export const ATTR_PREFIX = '@_';
export const IDX_PATH_PREFIX = `${ATTR_PREFIX}indexPath`;
export const IDX_PREFIX = `${ATTR_PREFIX}index`;

// the parser runs with preserveOrder, so every node is an object like {[nodeName]: childNodes,
// ':@': attrs} inside its parent's list of children, and text content is {'#text': value}
const ATTRS_KEY = ':@';
const TEXT_NODE_NAME = '#text';

/**
 * Transforms source XML to universal format
 *
 * @param xmlStr - The XML string to transform
 * @param platform - The platform name ('ios' or 'android')
 * @param opts - Transformation options
 * @param opts.metadata - Optional metadata object
 * @param opts.addIndexPath - Whether to add index path attributes
 * @returns Promise resolving to transformed XML and unknown nodes/attributes
 */
export async function transformSourceXml(
  xmlStr: string,
  platform: string,
  {metadata = {} as TransformMetadata, addIndexPath = false}: TransformSourceXmlOptions = {},
): Promise<{xml: string; unknowns: NodesAndAttributes}> {
  // the ios <AppiumAUT> root deliberately gets no index path: the XCUITest driver leaves that
  // wrapper out of the hierarchy it runs queries against, so index paths have to be relative to
  // the node below it. the android <hierarchy> root does carry an index attribute and is part of
  // the queried hierarchy, so it keeps its index path
  const xmlObj = singletonXmlParser().parse(xmlStr);
  const unknowns = transformChildNodes(xmlObj, platform, {
    metadata,
    addIndexPath,
    parentPath: '',
  });
  let transformedXml = singletonXmlBuilder().build(xmlObj).trim();
  transformedXml = `<?xml version="1.0" encoding="UTF-8"?>\n${transformedXml}`;
  return {xml: transformedXml, unknowns};
}

/**
 * Gets the universal node name for a platform-specific node name
 *
 * @param nodeName - The platform-specific node name
 * @param platform - The platform name
 * @returns The universal node name or null if not found
 */
export function getUniversalNodeName(nodeName: string, platform: string): string | null {
  return getUniversalName(NODE_MAP, nodeName, platform);
}

/**
 * Gets the universal attribute name for a platform-specific attribute name
 *
 * @param attrName - The platform-specific attribute name
 * @param platform - The platform name
 * @returns The universal attribute name or null if not found
 */
export function getUniversalAttrName(attrName: string, platform: string): string | null {
  return getUniversalName(ATTR_MAP, attrName, platform);
}

/**
 * Transforms a node object and its subtree in place
 *
 * @param nodeObj - The node object to transform, in the ordered form the parser produces
 * @param platform - The platform name
 * @param opts - Transformation options
 * @returns Object containing unknown nodes and attributes
 */
export function transformNode(
  nodeObj: any,
  platform: string,
  {metadata, addIndexPath, parentPath}: TransformNodeOptions,
): NodesAndAttributes {
  const unknownNodes: string[] = [];
  const unknownAttrs: string[] = [];
  const nodeName = Object.keys(nodeObj).find((key) => key !== ATTRS_KEY);
  // text content has no name or attributes to translate
  if (!nodeName || nodeName === TEXT_NODE_NAME) {
    return {nodes: unknownNodes, attrs: unknownAttrs};
  }

  // the parser leaves the attributes entry out for nodes that have none
  const attrsObj = nodeObj[ATTRS_KEY] ?? {};
  const attrs = Object.keys(attrsObj);
  let thisIndexPath = parentPath || '';

  if (attrs.length && addIndexPath) {
    if (!attrs.includes(IDX_PREFIX)) {
      throw new Error(`Index path is required but node found with no 'index' attribute`);
    }

    thisIndexPath = `${parentPath || ''}/${attrsObj[IDX_PREFIX] as string}`;
    attrsObj[IDX_PATH_PREFIX] = thisIndexPath;
  }

  const transformFn = TRANSFORMS[platform as keyof typeof TRANSFORMS];
  if (transformFn) {
    transformFn(attrsObj, metadata || ({} as TransformMetadata));
  }
  unknownAttrs.push(...transformAttrs(attrsObj, attrs, platform));
  if (!nodeObj[ATTRS_KEY] && Object.keys(attrsObj).length) {
    // keep anything the transformer added to a node that had no attributes
    nodeObj[ATTRS_KEY] = attrsObj;
  }

  // before modifying the name of this node, recurse down and modify the subtree
  const unknowns = transformChildNodes(nodeObj[nodeName], platform, {
    metadata,
    addIndexPath,
    parentPath: thisIndexPath,
  });
  unknownAttrs.push(...unknowns.attrs);
  unknownNodes.push(...unknowns.nodes);

  // now translate the node name. the node object keeps its place in the parent's list of children,
  // so siblings stay in document order even when several of them get the same universal name
  const universalName = getUniversalNodeName(nodeName, platform);
  if (universalName === null) {
    unknownNodes.push(nodeName);
  } else {
    nodeObj[universalName] = nodeObj[nodeName];
    delete nodeObj[nodeName];
  }
  return {
    nodes: util.uniq(unknownNodes),
    attrs: util.uniq(unknownAttrs),
  };
}

/**
 * Transforms a list of child nodes in place, keeping their order
 *
 * @param childNodes - The child nodes, in the ordered form the parser produces
 * @param platform - The platform name
 * @param opts - Transformation options
 * @returns Object containing unknown nodes and attributes
 */
export function transformChildNodes(
  childNodes: any[],
  platform: string,
  {metadata, addIndexPath, parentPath}: TransformNodeOptions,
): NodesAndAttributes {
  const unknownNodes: string[] = [];
  const unknownAttrs: string[] = [];
  for (const childObj of childNodes) {
    const {nodes, attrs} = transformNode(childObj, platform, {
      metadata,
      addIndexPath,
      parentPath: parentPath || '',
    });
    unknownNodes.push(...nodes);
    unknownAttrs.push(...attrs);
  }
  return {
    nodes: util.uniq(unknownNodes),
    attrs: util.uniq(unknownAttrs),
  };
}

/**
 * Transforms attributes of a node object
 *
 * @param nodeObj - The node object containing attributes
 * @param attrs - Array of attribute keys
 * @param platform - The platform name
 * @returns Array of unknown attribute names
 */
export function transformAttrs(nodeObj: any, attrs: string[], platform: string): string[] {
  const unknownAttrs: string[] = [];
  for (const attr of attrs) {
    const cleanAttr = attr.substring(2);
    if ((REMOVE_ATTRS as readonly string[]).includes(cleanAttr)) {
      delete nodeObj[attr];
      continue;
    }
    const universalAttr = getUniversalAttrName(cleanAttr, platform);
    if (universalAttr === null) {
      unknownAttrs.push(cleanAttr);
      continue;
    }
    const newAttr = `${ATTR_PREFIX}${universalAttr}`;
    if (newAttr !== attr) {
      nodeObj[newAttr] = nodeObj[attr];
      delete nodeObj[attr];
    }
  }
  return unknownAttrs;
}

/**
 * Gets the universal name for a platform-specific name from a name map
 *
 * @param nameMap - The name mapping object
 * @param name - The platform-specific name
 * @param platform - The platform name
 * @returns The universal name or null if not found
 */
function getUniversalName(
  nameMap: UniversalNameMap | Readonly<UniversalNameMap>,
  name: string,
  platform: string,
): string | null {
  for (const translatedName of Object.keys(nameMap)) {
    const sourceNodes = nameMap[translatedName]?.[platform];
    if (Array.isArray(sourceNodes) && sourceNodes.includes(name)) {
      return translatedName;
    }
    if (sourceNodes === name) {
      return translatedName;
    }
  }
  return null;
}

const singletonXmlBuilder = util.memoize(function makeXmlBuilder() {
  return new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: ATTR_PREFIX,
    suppressBooleanAttributes: false,
    format: true,
    preserveOrder: true,
  });
});

const singletonXmlParser = util.memoize(function makeXmlParser() {
  return new XMLParser({
    ignoreAttributes: false,
    ignoreDeclaration: true,
    attributeNamePrefix: ATTR_PREFIX,
    preserveOrder: true,
  });
});
