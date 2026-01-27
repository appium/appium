import _ from 'lodash';
import {XMLBuilder, XMLParser} from 'fast-xml-parser';
import NODE_MAP from './node-map';
import {ATTR_MAP, REMOVE_ATTRS} from './attr-map';
import * as TRANSFORMS from './transformers';
import type {
  NodesAndAttributes,
  TransformSourceXmlOptions,
  TransformNodeOptions,
  UniversalNameMap,
  TransformMetadata,
} from './types';

export const ATTR_PREFIX = '@_';
export const IDX_PATH_PREFIX = `${ATTR_PREFIX}indexPath`;
export const IDX_PREFIX = `${ATTR_PREFIX}index`;

const isAttr = (k: string): boolean => k.startsWith(ATTR_PREFIX);
const isNode = (k: string): boolean => !isAttr(k);

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
  {metadata = {} as TransformMetadata, addIndexPath = false}: TransformSourceXmlOptions = {}
): Promise<{xml: string; unknowns: NodesAndAttributes}> {
  // first thing we want to do is modify the ios source root node, because it doesn't include the
  // necessary index attribute, so we add it if it's not there
  xmlStr = xmlStr.replace('<AppiumAUT>', '<AppiumAUT index="0">');
  const xmlObj = singletonXmlParser().parse(xmlStr);
  const unknowns = transformNode(xmlObj, platform, {
    metadata,
    addIndexPath,
    parentPath: '',
  });
  let transformedXml = singletonXmlBuilder().build(xmlObj).trim();
  transformedXml = `<?xml version="1.0" encoding="UTF-8"?>\n${transformedXml}`;
  return {xml: transformedXml, unknowns};
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
  platform: string
): string | null {
  for (const translatedName of Object.keys(nameMap)) {
    const sourceNodes = nameMap[translatedName]?.[platform];
    if (_.isArray(sourceNodes) && sourceNodes.includes(name)) {
      return translatedName;
    }
    if (sourceNodes === name) {
      return translatedName;
    }
  }
  return null;
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
 * Transforms a node object recursively
 *
 * @param nodeObj - The node object to transform
 * @param platform - The platform name
 * @param opts - Transformation options
 * @returns Object containing unknown nodes and attributes
 */
export function transformNode(
  nodeObj: any,
  platform: string,
  {metadata, addIndexPath, parentPath}: TransformNodeOptions
): NodesAndAttributes {
  const unknownNodes: string[] = [];
  const unknownAttrs: string[] = [];
  if (_.isPlainObject(nodeObj)) {
    const keys = Object.keys(nodeObj);
    const childNodeNames = keys.filter(isNode);
    const attrs = keys.filter(isAttr);
    let thisIndexPath = parentPath || '';

    if (attrs.length && addIndexPath) {
      if (!attrs.includes(IDX_PREFIX)) {
        throw new Error(`Index path is required but node found with no 'index' attribute`);
      }

      thisIndexPath = `${parentPath || ''}/${nodeObj[IDX_PREFIX]}`;
      nodeObj[IDX_PATH_PREFIX] = thisIndexPath;
    }

    const transformFn = TRANSFORMS[platform as keyof typeof TRANSFORMS];
    if (transformFn) {
      transformFn(nodeObj, metadata || ({} as TransformMetadata));
    }
    unknownAttrs.push(...transformAttrs(nodeObj, attrs, platform));
    const unknowns = transformChildNodes(nodeObj, childNodeNames, platform, {
      metadata,
      addIndexPath,
      parentPath: thisIndexPath,
    });
    unknownAttrs.push(...unknowns.attrs);
    unknownNodes.push(...unknowns.nodes);
  } else if (_.isArray(nodeObj)) {
    for (const childObj of nodeObj) {
      const {nodes, attrs} = transformNode(childObj, platform, {
        metadata,
        addIndexPath,
        parentPath: parentPath || '',
      });
      unknownNodes.push(...nodes);
      unknownAttrs.push(...attrs);
    }
  }
  return {
    nodes: _.uniq(unknownNodes),
    attrs: _.uniq(unknownAttrs),
  };
}

/**
 * Transforms child nodes of a node object
 *
 * @param nodeObj - The node object containing child nodes
 * @param childNodeNames - Array of child node names
 * @param platform - The platform name
 * @param opts - Transformation options
 * @returns Object containing unknown nodes and attributes
 */
export function transformChildNodes(
  nodeObj: any,
  childNodeNames: string[],
  platform: string,
  {metadata, addIndexPath, parentPath}: TransformNodeOptions
): NodesAndAttributes {
  const unknownNodes: string[] = [];
  const unknownAttrs: string[] = [];
  for (const nodeName of childNodeNames) {
    // before modifying the name of this child node, recurse down and modify the subtree
    const {nodes, attrs} = transformNode(nodeObj[nodeName], platform, {
      metadata,
      addIndexPath,
      parentPath: parentPath || '',
    });
    unknownNodes.push(...nodes);
    unknownAttrs.push(...attrs);

    // now translate the node name and replace the subtree with this node
    const universalName = getUniversalNodeName(nodeName, platform);
    if (universalName === null) {
      unknownNodes.push(nodeName);
      continue;
    }

    // since multiple child node names could map to the same new transformed node name, we can't
    // simply assign nodeObj[universalName] = nodeObj[nodeName]; we need to be sensitive to the
    // situation where the end result is an array of children having the same node name
    if (nodeObj[universalName]) {
      // if we already have a node with the universal name, that means we are mapping a second
      // original node name to the same universal node name, so we just push all its children into
      // the list
      if (_.isArray(nodeObj[universalName])) {
        if (_.isArray(nodeObj[nodeName])) {
          nodeObj[universalName].push(...nodeObj[nodeName]);
        } else {
          nodeObj[universalName].push(nodeObj[nodeName]);
        }
      } else {
        nodeObj[universalName] = [nodeObj[universalName]];
        if (_.isArray(nodeObj[nodeName])) {
          nodeObj[universalName].push(...nodeObj[nodeName]);
        } else {
          nodeObj[universalName].push(nodeObj[nodeName]);
        }
      }
    } else {
      nodeObj[universalName] = nodeObj[nodeName];
    }
    delete nodeObj[nodeName];
  }
  return {nodes: unknownNodes, attrs: unknownAttrs};
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

const singletonXmlBuilder = _.memoize(function makeXmlBuilder() {
  return new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: ATTR_PREFIX,
    suppressBooleanAttributes: false,
    format: true,
  });
});

const singletonXmlParser = _.memoize(function makeXmlParser() {
  return new XMLParser({
    ignoreAttributes: false,
    ignoreDeclaration: true,
    attributeNamePrefix: ATTR_PREFIX,
    isArray: (name, jPath, isLeafNode, isAttribute) => !isAttribute,
  });
});
