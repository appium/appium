import _ from 'lodash';
import parser, { j2xParser } from 'fast-xml-parser';
import NODE_MAP from './node-map';
import { ATTR_MAP, REMOVE_ATTRS } from './attr-map';
import TRANSFORMS from './transformers';

const PARSE_OPTS = {
  ignoreAttributes: false,
  arrayMode: true,
};

const GEN_OPTS = {
  ignoreAttributes: false,
  arrayMode: true,
  format: true,
};

export const ATTR_PREFIX = '@_';
export const IDX_PATH_PREFIX = `${ATTR_PREFIX}indexPath`;
export const IDX_PREFIX = `${ATTR_PREFIX}index`;

const isAttr = (k) => k.substring(0, 2) === ATTR_PREFIX;
const isNode = (k) => !isAttr(k);

export function transformSourceXml (xmlStr, platform, {metadata = {}, addIndexPath = false} = {}) {
  // first thing we want to do is modify the ios source root node, because it doesn't include the
  // necessary index attribute, so we add it if it's not there
  xmlStr = xmlStr.replace('<AppiumAUT>', '<AppiumAUT index="0">');
  const xmlObj = parser.parse(xmlStr, PARSE_OPTS);
  const unknowns = transformNode(xmlObj, platform, {metadata, addIndexPath, parentPath: ''});
  const jParser = new j2xParser(GEN_OPTS);
  let transformedXml = jParser.parse(xmlObj).trim();
  transformedXml = `<?xml version="1.0" encoding="UTF-8"?>\n${transformedXml}`;
  return {xml: transformedXml, unknowns};
}

function getUniversalName (nameMap, name, platform) {
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

export function getUniversalNodeName (nodeName, platform) {
  return getUniversalName(NODE_MAP, nodeName, platform);
}

export function getUniversalAttrName (attrName, platform) {
  return getUniversalName(ATTR_MAP, attrName, platform);
}

export function transformNode (nodeObj, platform, {metadata, addIndexPath, parentPath}) {
  const unknownNodes = [];
  const unknownAttrs = [];
  if (_.isPlainObject(nodeObj)) {
    const keys = Object.keys(nodeObj);
    const childNodeNames = keys.filter(isNode);
    const attrs = keys.filter(isAttr);
    let thisIndexPath = parentPath;

    if (attrs.length && addIndexPath) {
      if (!attrs.includes(IDX_PREFIX)) {
        throw new Error(`Index path is required but node found with no 'index' attribute`);
      }

      thisIndexPath = `${parentPath}/${nodeObj[IDX_PREFIX]}`;
      nodeObj[IDX_PATH_PREFIX] = thisIndexPath;
    }

    TRANSFORMS[platform]?.(nodeObj, metadata);
    unknownAttrs.push(...transformAttrs(nodeObj, attrs, platform));
    const unknowns = transformChildNodes(nodeObj, childNodeNames, platform, {
      metadata, addIndexPath, parentPath: thisIndexPath
    });
    unknownAttrs.push(...unknowns.attrs);
    unknownNodes.push(...unknowns.nodes);
  } else if (_.isArray(nodeObj)) {
    for (const childObj of nodeObj) {
      const {nodes, attrs} = transformNode(childObj, platform, {
        metadata, addIndexPath, parentPath
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

export function transformChildNodes (nodeObj, childNodeNames, platform, {metadata, addIndexPath, parentPath}) {
  const unknownNodes = [];
  const unknownAttrs = [];
  for (const nodeName of childNodeNames) {
    // before modifying the name of this child node, recurse down and modify the subtree
    const {nodes, attrs} = transformNode(nodeObj[nodeName], platform, {metadata, addIndexPath, parentPath});
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
      nodeObj[universalName].push(...nodeObj[nodeName]);
    } else {
      nodeObj[universalName] = nodeObj[nodeName];
    }
    delete nodeObj[nodeName];
  }
  return {nodes: unknownNodes, attrs: unknownAttrs};
}

export function transformAttrs (nodeObj, attrs, platform) {
  const unknownAttrs = [];
  for (const attr of attrs) {
    const cleanAttr = attr.substring(2);
    if (REMOVE_ATTRS.includes(cleanAttr)) {
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
